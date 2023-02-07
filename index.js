const OpenAi = require("openai");
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const nodemailer = require("nodemailer");

//Configuration
require("dotenv").config();
const app = express();
const port = process.env.PORT;
app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());

//Open AI config
const { Configuration, OpenAIApi } = OpenAi;

const configuration = new Configuration({
  organization: "org-ZiSgZLZon8TWasqR2tk6H2oU",
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

//Generate meal plan
app.post("/createMealPlan", async (req, res) => {
  try {
    const {
      dailyCalorieIntake,
      dailyProteinIntake,
      pathChoice,
      selectedCuisine,
      selectedMeal,
      selectedPlan,
      dietaryPreferences,
    } = req.body;

    const { prompt } = req.body;

    const response = await openai.createCompletion({
      model: "text-davinci-003",
      prompt: `
        You are a professional chef who is specialised at making healthy meals.
        You: How can I help?
        Person: Can you make me meal plan that will help me ${pathChoice}
        You: Yes I can, can you give me some more details about what you require.
        Person: In order to ${pathChoice}, based on my caluculations I require ${dailyCalorieIntake} calories${
        dailyProteinIntake && ` and ${dailyProteinIntake} grams of protein`
      } per day.
        ${
          selectedPlan === "Single"
            ? `Can you make me a ${selectedMeal} meal based on the roughly a third of amount of calories${
                dailyProteinIntake && ` and protein`
              } I require daily which would mean the meal would be roughly a third of ${dailyCalorieIntake}${
                dailyProteinIntake && ` and ${dailyProteinIntake}`
              }.
                Can you include the calorie ${
                  dailyProteinIntake && `and protein`
                } amounts for this meal. Make this be a meal and not simply a list of ingredients.
          ${
            selectedCuisine &&
            selectedCuisine !== "no preference" &&
            `I would like the meal to be from the ${selectedCuisine} cuisine.`
          } Start your response with "Here is" followed by a brief description of what the meal is and the which includes the name of the meal and the calorie ${
                dailyProteinIntake && ` and ${dailyProteinIntake}`
              } contents. This should be followed the necessary ingredients in bullet point format.
              This should be followed by step by step instructions on how to cook the meal also in bullet point format.
              Conclude the plan with some pleasantries but do not ask if I need any more questions or any further help.`
            : ""
        }

        ${
          selectedPlan === "Daily"
            ? `Can you make me a ${selectedPlan} meal plan strictly based on the amount of calories${
                dailyProteinIntake && ` and protein`
              } I need per day. This plan should include breakfast, lunch and dinner and can also include snacking as well.
            Can the plan include the calorie ${
              dailyProteinIntake && `and protein`
            } amounts for each meal.
          Can you make the meal plan as healthy as possible.
          Start your response with "Here is your healthy and delicions meal plan" followed by the name of the meal followed by ingredients in bullet point format.
          Can the last bullet point be the total calories ${
            dailyProteinIntake && `and protein`
          } for the plan per day.
      `
            : ""
        }

        ${
          dietaryPreferences &&
          `I am also ${dietaryPreferences} so can you bear that in mind when making the meal plan.`
        }
        You:

      `,
      max_tokens: 800,
      temperature: 0.7,
    });
    res.status(200).send({
      message: response.data.choices[0].text,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({
      message: "There has been an error",
    });
  }
});

// Send meal plan as email
app.post("/emailSubmit", async (req, res) => {
  try {
    const { data, email } = req.body;

    var arrayItems = "";
    var n;
    for (n in data) {
      arrayItems += "<p style='padding: 0 30px'>" + data[n] + "</>";
    }

    let transporter = nodemailer.createTransport({
      service: "hotmail",
      auth: {
        user: process.env.EMAIL,
        pass: process.env.PASSWORD,
      },
    });

    // send mail with defined transport object
    await transporter.sendMail({
      from: process.env.EMAIL,
      to: email,
      subject: "Here is your meal plan!",
      html: `<!DOCTYPE html>
              <html lang="en">
              <head>
              <style>
              @import url('https://fonts.googleapis.com/css2?family=Barlow:wght@200;300;400;500;600&display=swap');
              </style>
              </head>
              <body style="font-family: 'Barlow', sans-serif;">
                <div style="width: 100%; background-color: #f3f9ff; padding: 5rem 0">
                  <div style="max-width: 700px; background-color: white; margin: 0 auto">
                    <div style="width: 100%; ; padding: 20px 0">
                      <img
                        src="https://i.ibb.co/BwTwbM2/Screen-Shot-2023-01-30-at-13-16-05.png"
                        style="width: 100%; height: 70px; object-fit: contain"
                      />
                    </div>
                    <div style="width: 100%; gap: 10px; padding:0; display: grid">
                     <div style="margin-bottom: 30px">
                      <p style="font-weight: 600; font-size: 1.2rem; padding: 0 30px">
                        Your Meal Plan!
                      </p>
                      ${arrayItems}
                      <p style="font-weight: 600; font-size: 1rem; margin-top:30px; padding: 0 30px">Thank you for using NutriPlan!</p>
                      </div>
                    </div>
                  </div>
                </div>         
              </body>
              </html>`,
    });
    res.send({
      message: "Success",
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({
      message: error.message,
    });
  }
});
