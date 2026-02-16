// const midtransClient = require("midtrans-client");
//     let transactionToken: string;
//     let redirectUrl
//     try {
//       const serverKey = env().MIDTRANS_SERVER_KEY;
//       if (!serverKey) {
//         throw new Error("MIDTRANS_SERVER_KEY tidak diset di .env");
//       }
//       const snap = new midtransClient.Snap({
//           isProduction : false,
//           serverKey : serverKey
//         });

//       const transactionSnap = await snap.createTransaction(parameter);
//         transactionToken = transactionSnap.token;
//         redirectUrl = transactionSnap.redirect_url;
//     } catch (error) {
//       console.error("Error creating Midtrans transaction:", error);
//     }