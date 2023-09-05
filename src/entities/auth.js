const mailer = require("../lib/nodemailer");
const db = require("../models");
const Entity = require("./entity");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const mustache = require("mustache");
const sharp = require("sharp");
const moment = require("moment");

class Auth extends Entity {
  constructor(model) {
    super(model);
  }

  /*  login(req, res) {
    const { user, password } = req.body;

    db.User.findOne({
      where: {
        [db.Sequelize.Op.or]: {
          email: { [db.Sequelize.Op.like]: `%${user}` },
          username: { [db.Sequelize.Op.like]: `%${user}` },
          phone_number: { [db.Sequelize.Op.like]: `%${user}` },
        },
      },
    })
      .then(async (result) => {
        console.log(result);
        // console.log(password);
        const isValid = await bcrypt.compare(
          password,
          result.dataValues.password
        );
        if (!isValid) {
          throw new Error("Wrong Password cokk");
        }
        delete result.dataValues.password;

        const payload = {
          id: result.dataValues.id,
          is_verified: result.dataValues.is_verified,
        };

        const token = jwt.sign(payload, process.env.jwt_secret, {
          expiresIn: "1h",
        });

        return res.send({ token, user: result });
      })

      .catch((err) => {
        res.status(500).send(err?.message);
      });
  } */

  login(req, res) {
    const { user, password } = req.body;
    db.User.findOne({
      where: {
        [db.Sequelize.Op.or]: {
          email: { [db.Sequelize.Op.like]: `%${user}%` },
          username: { [db.Sequelize.Op.like]: `%${user}%` },
          phone_number: { [db.Sequelize.Op.like]: `%${user}%` },
        },
      },
      //select * from users where email like '%%' or username like '%%' or phone_number like '%%'
    })
      .then(async (result) => {
        console.log(
          moment(moment(result.dataValues.suspended_date).format()).diff(
            moment().format()
          ),
          "this"
        );
        if (
          moment(moment(result.dataValues.suspended_date).format()).diff(
            moment().format()
          ) > 0
        )
          throw new Error(
            `your account has been suspended for ${
              moment(moment(result.dataValues.suspended_date).format()).diff(
                moment().format()
              ) / 1000
            } sec`
          );

        const isValid = await bcrypt.compare(
          password,
          result.dataValues.password
        );
        if (!isValid) {
          if (result.dataValues.login_attempt >= 2)
            db.User.update(
              {
                login_attempt: 0,
                suspended_date: moment()
                  .add(moment.duration(30, "second"))
                  .format(),
              },
              {
                where: {
                  id: result.dataValues.id,
                },
              }
            );
          else
            db.User.update(
              { login_attempt: result.dataValues.login_attempt + 1 },
              {
                where: {
                  id: result.dataValues.id,
                },
              }
            );
          throw new Error("wrong password");
        }
        delete result.dataValues.password;

        const payload = {
          id: result.dataValues.id,
          is_verified: result.dataValues.is_verified,
        };

        const token = jwt.sign(payload, process.env.jwt_secret, {
          expiresIn: "1h",
        });

        return res.send({ token, user: result });
      })
      .catch((err) => {
        res.status(500).send(err?.message);
      });
  }

  async register(req, res) {
    try {
      const isUserExist = await db.User.findOne({
        where: {
          [db.Sequelize.Op.or]: {
            email: { [db.Sequelize.Op.like]: `%${req.body.email}` },
            username: { [db.Sequelize.Op.like]: `%${req.body.username}` },
            phone_number: {
              [db.Sequelize.Op.like]: `%${req.body.phone_number}`,
            },
          },
        },
      });

      if (isUserExist?.dataValues?.id) {
        throw new Error("user sudah terdaftar");
      }

      req.body.password = await bcrypt.hash(req.body.password, 10);

      this.create(req, res);
    } catch (err) {
      res.status(500).send(err?.message);
    }
  }

  async keepLogin(req, res) {
    try {
      const { token } = req.params;
      const data = jwt.verify(token, process.env.jwt_secret);
      if (!data) throw new Error("invalid token");

      console.log(data);
      const payload = await db.User.findOne({
        where: {
          id: data.id,
        },
      });
      delete payload.dataValues.password;

      const newToken = jwt.sign(
        { id: data.id, is_verified: payload.dataValues.is_verified },
        process.env.jwt_secret,
        {
          expiresIn: "1h",
        }
      );

      return res.send({ token: newToken, user: payload });
    } catch (err) {
      res.status(500).send(err?.message);
    }
  }

  async editProfile(req, res) {
    try {
      const isUserExist = await db.User.findOne({
        where: {
          [db.Sequelize.Op.or]: {
            username: req.body.username,
          },
        },
      });
      console.log(req?.file?.filename);
      if (req?.file?.filename) req.body.image_url = req.file.filename;
      else delete req.body.image_url;

      if (isUserExist?.dataValues?.id != req.params.id && isUserExist) {
        throw new Error("username sudah terdaftar");
      }

      console.log(req.body);
      this.updateById(req, res);
    } catch (err) {
      res.status(500).send(err?.message);
    }
  }

  async test(req, res) {
    console.log(req.file);
    console.log(req.body);
    if (req.file) {
      req.body.image_blob = await sharp(req.file.buffer).png().toBuffer();
      req.body.image_url = req.file.originalname;
    }
    db.User.update(req.body, {
      where: {
        id: req.body.id,
      },
    });
    res.send("testing");
  }

  // async renderImage(req, res) {}

  async resendVerification(req, res) {
    const { id } = req.params;
    const user = await db.User.findOne({
      where: {
        id,
      },
    });
    const template = fs
      .readFileSync(__dirname + "/../template/verify.html")
      .toString();

    const token = jwt.sign(
      {
        id: user.dataValues.id,
        is_verified: user.dataValues.is_verified,
      },
      process.env.jwt_secret,
      {
        expiresIn: "5min",
      }
    );
    console.log(token);

    const rendered = mustache.render(template, {
      username: user.dataValues.username,
      fullname: user.dataValues.fullname,
      verify_url: process.env.verify_url + token,
    });

    await mailer({
      subject: "user verification",
      html: rendered,
      to: "nazhifsetya@gmail.com",
      text: "silahkan verifikasi email anda",
    });
    res.send("verification has been sent");
  }

  async verifyUser(req, res) {
    try {
      const { token } = req.query;
      const payload = jwt.verify(token, process.env.jwt_secret);

      if (payload.is_verified) throw new Error("user already verified");
      db.User.update(
        {
          is_verified: true,
        },
        {
          where: {
            id: payload.id,
          },
        }
      );
      res.send("user has been verified");
    } catch (error) {
      res.status(500).send(error?.message);
    }
  }

  async renderImage(req, res) {
    const { username, image_name } = req.query;
    db.User.findOne({
      where: {
        username,
        image_url: image_name,
      },
    })
      .then((result) => {
        res.set("Content-type", "image/png");
        res.send(result.dataValues.image_blob);
      })
      .catch((err) => {
        res.status(500).send(err?.message);
      });
  }
}

module.exports = Auth;
