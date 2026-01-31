import express from "express";

import { registerUser, confirmCode, testFunction } from "./service";

const router = express.Router();

router.get("/", (req, res) => {
  res.send("GET LCES api");
});

router.post("/register", async (req, res) => {
  try {
    const data = req.body;
    console.log("LCES Register Params:", data);

    // Validate email field
    if (!data.email ||
        typeof data.email !== 'string' ||
        !/^\S+@\S+\.\S+$/.test(data.email)) {
      res.status(400).send("Invalid or missing email");
      return;
    }

    //Register
    const result = await registerUser(data);

    if (result === "error") {
      res.status(500).send("Internal Server Error");
      return;
    }

    //Send ok response
    res.send("POST LCES register api");
  } catch (err) {
    console.error("Error in LCES register api:", err);
    res.status(500).send("Internal Server Error");
  }
});

router.post("/confirm/:number", async (req, res) => {
  try {
    const data = req.params;

    const result = await confirmCode(Number(data.number));
    if (result === "error") {
      console.log("api_route - Error confirming code");
      res.status(500).send("Internal Server Error");
      return;
    }
    else if (result === "not_found") {  
      console.log("api_route - Confirm code not found");
      res.status(404).send("Confirm Code Not Found");
      return;
    }

    //Send ok response
    res.send("POST LCES confirm api");
  } catch (err) {
    //console.error("Error in LCES confirm api:", err);
    res.status(500).send("Internal Server Error");
  }
});

router.get("/test", async (req, res) => {
  try {
    const data = req.params;

    const result = await testFunction();
    if (result === "error") {
      res.status(500).send("Internal Server Error");
      return;
    }

    //Send ok response
    res.send("POST LCES test api");
  } catch (err) {
    console.error("Error in LCES test api:", err);
    res.status(500).send("Internal Server Error");
  }
});

export default router;
