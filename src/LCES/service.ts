import Mailjet from "node-mailjet";
import axios from "axios";

import redisHelper from "../utils/redisHelper";
import RedisHelper from "../utils/redisHelper";
import { connectRedis } from "../utils/redisClient";

const debug_this = true;

const access_token_Key = "lces-web:accessToken";
const refresh_token_Key = "lces-web:refreshToken";

export async function registerUser(data: any) {
  try {
    if (debug_this) {
      console.log("Registering user with data:", data);
    }

    //Connect Redis
    await connectRedis();

    //Store registration data in cache
    await redisHelper.set(
      `lces:register:${data.email}`,
      JSON.stringify(data),
      RedisHelper.TTL.five_minutes,
    );

    //Generate Number
    const confirmNumber = Math.floor(100000 + Math.random() * 900000);
    if (debug_this) {
      console.log("Generated confirm number:", confirmNumber);
    }

    //Store confirm number in cache
    await redisHelper.set(
      `lces:register:confirm:${confirmNumber}`,
      data.email.toString(),
      RedisHelper.TTL.five_minutes,
    );

    //Send Confirmation Email
    await sendConfirmationEmail(data.email, data.currency, confirmNumber);

    //Return ok
    return "ok";
  } catch (err) {
    console.error("Error in registerUser:", err);
    return "error";
  }
}

export async function confirmCode(code: number) {
  try {
    if (debug_this) {
      console.log("Confirming code:", code);
    }

    //Connect Redis
    await connectRedis();

    //Get the stored confirm number from cache
    const email = await redisHelper.get(`lces:register:confirm:${code}`);
    if (!email) {
      if (debug_this) {
        console.log("No email found for confirm code:", code);
      }
      return "not_found";
    }

    //Mark email as confirmed
    const registerInfo = await redisHelper.get(`lces:register:${email}`);
    if (!registerInfo) {
      if (debug_this) {
        console.log("No registration info found for email:", email);
      }
      return "error";
    }
    console.log("Registration info:", registerInfo);

    const accessToken = await getToken();
    console.log("Access Token for user creation:", accessToken);

    // Create user
    const user_payload = {
      firstname: JSON.parse(registerInfo).firstname,
      lastname: JSON.parse(registerInfo).lastname,
      email: email,
      phone: JSON.parse(registerInfo).phone,
      password: JSON.parse(registerInfo).password,
    };
    const user_url = "https://open-ces-production.up.railway.app/api/user";
    const user_response = await axios.post(user_url, user_payload, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (user_response.status !== 201) {
      if (debug_this) {
        console.log("Failed to create user, status:", user_response.status);
      }
      return "error";
    }
    console.log("User creation response:", user_response.data);

    //Create account
    const account_payload = {
      ownerId: user_response.data.id,
      symbol : "CES",
      accountType: 2,
    };
    const account_url = "https://open-ces-production.up.railway.app/api/account";
    const account_response = await axios.post(account_url, account_payload, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (account_response.status !== 201) {
      if (debug_this) {
        console.log("Failed to create account, status:", account_response.status);
      }
      return "error";
    }



    //Cleanup
    /*await redisHelper.del(`lces:register:confirm:${code}`);
    await redisHelper.del(`lces:register:${email}`);*/

    if (debug_this) {
      console.log("User created successfully for email:", email);
    }

    return "ok";
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

  //Connect Redis
  await connectRedis();

  // Store access Token in Redis
  const accessToken = response.data.accessToken;
  await redisHelper.set(
    access_token_Key,
    accessToken,
    RedisHelper.TTL.five_minutes,
  );

  // Store refresh Token in Redis
  const refreshToken = response.data.refreshToken;
  await redisHelper.set(
    refresh_token_Key,
    refreshToken,
    RedisHelper.TTL.one_hour,
  );

  if (debug_this) {
    console.log("service.ts - admin login - access token", accessToken);
    console.log("service.ts - admin login - refresh token", refreshToken);
  }
}

async function refreshToken() {

   if (debug_this) {
      console.log("Service.ts - Refreshing the token");
    }

  const refreshToken = await redisHelper.get(refresh_token_Key);
  if (!refreshToken) {
    if (debug_this) {
      console.log("Service.ts - Refresh - Refresh token not found...");
    }
    return;
  }

  if (debug_this) {
    console.log("Service.ts - Refresh - Refreshing LCES token with token:", refreshToken);
  }

  const url = process.env.LCES_REFRESH_URL || "";
  const payload = {
    refreshToken: refreshToken,
  };
  const response = await axios.post(url, payload);

  if (response.status !== 200) {
    throw new Error("Service.ts - Refresh Exception : LCES Token refresh failed");
  }

  //Connect Redis
  await connectRedis();

  // Store new access Token in Redis
  const newAccessToken = response.data.accessToken;
  console.log("Service.ts - Refresh - New Access Token:", newAccessToken);

  await redisHelper.set(
    access_token_Key,
    newAccessToken,
    RedisHelper.TTL.five_minutes,
  );

  if (debug_this) {
    console.log("LCES New access token", newAccessToken);
  }
}

async function getToken() {
  //Connect Redis
  await connectRedis();

  let accessToken = await redisHelper.get(access_token_Key);
  if (!accessToken) {
    if (debug_this) {
      console.log("service.ts - getToken - Access token not found, refreshing...");
    }
    // Refresh the token
    await refreshToken();

    accessToken = await redisHelper.get(access_token_Key);
    if (!accessToken) {
      if (debug_this) {
        console.log("service.ts - getToken - Access token still not found, performing admin login...");
      }

      //Login as admin
      await adminLogin();

      accessToken = await redisHelper.get(access_token_Key);
      if (!accessToken) {
        throw new Error("No access token even after a login");
      }
    }
  }

  if (debug_this) {
    console.log("service.ts - getToken - Access token retrieved:", accessToken);
  }

  return accessToken;
}

export async function testFunction() {
  try {
    const token = await getToken();

    console.log("Test function executed", token);
    return "ok";
  } catch (err) {
    //console.error("Error in testFunction:", err);
    return "error";
  }
}
