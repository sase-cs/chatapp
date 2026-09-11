//const express = require('express');
import express from "express"; //syntax from "module" type in package.json
import "dotenv/config"

const app = express();
const PORT = process.env.PORT;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});