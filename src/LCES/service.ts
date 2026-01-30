import Mailjet from "node-mailjet";
import axios from "axios";

import redisHelper from "../utils/redisHelper";
import RedisHelper from "../utils/redisHelper";
import { connectRedis } from "../utils/redisClient";

export async function registerUser(data: any) {
  try {
    console.log("Registering user with data:", data);

    //Connect Redis
    await connectRedis();

    //Store registration data in cache
    const key = `lces:register:${data.email}`;
    await redisHelper.set(
      key,
      JSON.stringify(data),
      RedisHelper.TTL.five_minutes,
    );

    //Generate Number
    const confirmNumber = Math.floor(100000 + Math.random() * 900000);

    //Store confirm number in cache
    const confirmKey = `lces:register:confirm:${confirmNumber}`;
    await redisHelper.set(
      confirmKey,
      data.email.toString(),
      RedisHelper.TTL.five_minutes,
    );

    //Send Confirmation Email
    await sendConfirmationEmail(data.email, data.currency, confirmNumber);
    return "ok";
  } catch (err) {
    console.error("Error in registerUser:", err);
    return "error";
  }
}

export async function confirmCode(code: number) {
  try {
    //Connect Redis
    await connectRedis();

    //Store confirm number in cache
    const confirmKey = `lces:register:confirm:${code}`;
    console.log("Confirm Key:", confirmKey);

    const email = await redisHelper.get(confirmKey);
    if (email) {
      console.log("Email confirmed for:", email);
      //Mark email as confirmed
      const key = `lces:register:${email}`;
      const registerInfo = await redisHelper.get(key);
      if (registerInfo) {
        console.log("Register Info:", registerInfo);

        const token = await getToken();

        // Create user

        //Create account

        return "ok";
      }
    }
  } catch (err) {
    console.error("Error in confirmCode:", err);
    return "error";
  }
}

export async function sendConfirmationEmail(
  email: string,
  currency: string,
  confirmNumber: number,
) {
  //Send Mail
  const mailjet = Mailjet.apiConnect(
    process.env.MJ_APIKEY_PUBLIC || "",
    process.env.MJ_APIKEY_PRIVATE || "",
  );
  const request = mailjet.post("send", { version: "v3.1" }).request({
    Messages: [
      {
        From: {
          Email: "jsomville@hotmail.com",
          Name: currency + " Support",
        },
        To: [
          {
            Email: email,
          },
        ],
        Subject: "Email confirmation for " + currency + " registration",
        TextPart: "Your confirmation code is: " + confirmNumber,
        HTMLPart: "<h3>Your confirmation code is: " + confirmNumber + "</h3>",
      },
    ],
  });
  request
    .then((result) => {
      console.log(result.body);
    })
    .catch((err) => {
      console.log(err.statusCode);
    });
}

export async function adminLogin() {
  const username = process.env.LCES_ADMIN_USERNAME || "";
  const password = process.env.LCES_ADMIN_PASSWORD || "";

  const url = process.env.LCES_AUTH_URL || "";
  const response = await axios.post(url, {
    username,
    password,
  });

  if (response.status !== 200) {
    throw new Error("LCES Admin login failed");
  }

  const token = response.data.token;
}

export async function getToken() {

    const key = "lces:api_token";
    const exists = await redisHelper.exists(key);
    if (exists) {
      const token = await redisHelper.get(key);
      return token;
    }
    else{
        await adminLogin();


    }

}
