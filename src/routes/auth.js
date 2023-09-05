const express = require("express");
const authController = require("../controllers/authController");
const { fileUploader, blobUploader } = require("../middlewares/multer");
const { userValidationRules, validate } = require("../middlewares/validator");

const route = express.Router();

route.get("/", authController.login.bind(authController));
route.get("/render", authController.renderImage.bind(authController));
route.get("/:id", authController.getById.bind(authController));
route.delete("/:id", authController.deleteById.bind(authController));
// route.patch("/:id", authController.updateById.bind(authController));

route.patch(
  "/:id",
  fileUploader({
    destinationFolder: "avatar",
    prefix: "AVATAR",
    filetype: "image",
  }).single("image"),
  authController.editProfile.bind(authController)
);

// route.post("/v1", authController.register.bind(authController)); //register
route.post(
  "/v1",
  userValidationRules(),
  validate,
  authController.register.bind(authController)
); //register

route.post("/v2", authController.login.bind(authController)); //login
route.get("/token/:token", authController.keepLogin.bind(authController));

route.post(
  "/test",
  blobUploader({
    filetype: "image",
  }).single("image"),
  authController.test.bind(authController)
);

route.post(
  "/resend/:id",
  authController.resendVerification.bind(authController)
);

route.post("/verify/token", authController.verifyUser.bind(authController));

module.exports = route;
