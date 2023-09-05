const db = require("../models");
const Entity = require("./entity");
const { Op } = db.Sequelize;
class Post extends Entity {
  constructor(model) {
    super(model);
  }

  getPost(req, res) {
    db.Post.findAll({
      include: { model: db.User, as: "user" },
      order: [["createdAt", "DESC"]],
    })
      .then((result) => {
        res.send(result);
      })
      .catch((err) => res.status(500).send(err?.message));
  }

  getPostByUserId(req, res) {
    db.Post.findAll({
      include: { model: db.User, as: "user" },
      where: {
        user_id: req.params.id,
      },
    })
      .then((result) => res.send(result))
      .catch((err) => res.status(500).send(err?.message));
  }

  getPostByFilter(req, res) {
    db.Post.findAll({
      include: {
        model: db.User,
        as: "user",
      },
      where: {
        [db.Sequelize.Op.or]: {
          caption: { [db.Sequelize.Op.like]: `%${req.query.search}%` },
          "$user.username$": {
            [db.Sequelize.Op.like]: `%${req.query.search}%`,
          },
        },
      },
    })
      .then((result) => {
        res.send(result);
      })
      .catch((err) => res.status(500).send(err?.message));
  }
}

module.exports = Post;
