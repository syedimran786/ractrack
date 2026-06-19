const { Schema, model } = require("mongoose");
const jwt = require("jsonwebtoken");

const userSchema = new Schema(
  {
    fullname: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },

    password: {
      type: String,
      required: true,
      select: false,
    },

    role: {
      type: String,
      enum: [
        "admin",
        "hr",
        "counsellor",
        "branding",
        "trainer",
        "bd",
      ],
      required: true,
      index: true,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    refreshToken: {
      type: String,
      default: null,
    },
    mustChangePassword: {
  type: Boolean,
  default: true,
  index: true,
},
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.methods.generateAccessToken =
  function () {
    return jwt.sign(
      {
        id: this._id,
        role: this.role,
      },
      process.env.ACCESS_TOKEN_SECRET,
      {
        expiresIn:
          process.env.ACCESS_TOKEN_EXPIRY ||
          "15m",
      }
    );
  };

userSchema.methods.generateRefreshToken =
  function () {
    return jwt.sign(
      {
        id: this._id,
      },
      process.env.REFRESH_TOKEN_SECRET,
      {
        expiresIn:
          process.env.REFRESH_TOKEN_EXPIRY ||
          "7d",
      }
    );
  };

module.exports = model("User", userSchema);