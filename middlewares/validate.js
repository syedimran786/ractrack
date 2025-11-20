const validate = (schema) => {
  return async (req, res, next) => {
    try {
      const validated = await schema.validateAsync(
        {
          body: req.body,
          query: req.query,
          params: req.params,
        },
        { abortEarly: false }
      );

      req.body = validated.body;
      req.query = validated.query;
      req.params = validated.params;

      next();
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: "Validation Error",
        errors: error.details.map((d) => d.message),
      });
    }
  };
};

module.exports = validate;
