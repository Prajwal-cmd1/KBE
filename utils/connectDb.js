import mongoose from "mongoose";

const connectDB =  (uri) => {
   mongoose
    .connect(uri, { dbName: "Knock" })
    .then((data) => {
      console.log(`connected to db ${data.connection.host}`);
    })
    .catch((err) => {
      throw err;
    });
};

export default connectDB;
