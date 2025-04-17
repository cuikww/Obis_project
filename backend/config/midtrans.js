import midtransClient from "midtrans-client";

const snap = new midtransClient.Snap({
    isProduction: false, 
    serverKey: process.env.MIDTRANS_SERVER,
    clientKey: process.env.MIDTRANS_CLIENT,
});

export default snap;