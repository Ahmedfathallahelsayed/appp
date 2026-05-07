import "dotenv/config";

export default {
  expo: {
    ...require("./app.json").expo,

    extra: {
      groqApiKey: process.env.EXPO_PUBLIC_GROQ_API_KEY,
    },
  },
};
