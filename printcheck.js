import fs from "fs";
import crypto from "crypto";

const privateKey = fs.readFileSync("key.pem", "utf8");

function sign(data) {
  const signer = crypto.createSign("SHA256");
  signer.update(data);
  return signer.sign(privateKey, "base64");
}
