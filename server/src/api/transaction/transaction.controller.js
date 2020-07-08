import Transaction from "./transaction.model";
import { ErrorHandler } from "../../helper/error";
import Notification from "../notification/notification.model";

export async function createTransaction(req, res, next) {
  try {
    let buyer = req.body.buyer.map((item) => ({
      publicAddress: item,
      isAccept: false,
    }));
    buyer[0].isAccept = true;
    const seller = req.body.seller.map((item) => ({
      publicAddress: item,
      isAccept: false,
    }));
    const { transferPrice, downPayment, idProperty } = req.body;
    const newTransaction = {
      buyer,
      seller,
      transferPrice,
      downPayment,
      idProperty,
    };
    const transaction = await Transaction.create(newTransaction);
    const sellerContent = {
      senderAddress: req.user.publicAddress,
      url: `/transaction/${transaction._id}`,
      message: "Bạn nhận được một lời mời bán tài sản.",
    };
    const buyerContent = {
      senderAddress: req.user.publicAddress,
      url: `/transaction/${transaction._id}`,
      message: "Bạn được mời tham gia vào một giao dịch.",
    };
    const p1 = transaction.seller.map((seller) => {
      Notification.create({
        userAddress: seller.publicAddress,
        ...sellerContent,
      }).then();
    });
    const p2 = transaction.buyer.map((buyer) => {
      Notification.create({
        userAddress: buyer.publicAddress,
        ...buyerContent,
      }).then();
    });
    Promise.all([p1, p2]);
    return res.status(201).json({ statusCode: 201, data: transaction });
  } catch (error) {
    next(error);
  }
}

export async function getMyTransactions(req, res, next) {
  try {
    let transactionP1 = Transaction.find({
      $in: {
        buyers: req.user.publicAddress,
      },
    });
    let transactionP2 = Transaction.find({
      $in: {
        sellers: req.user.publicAddress,
      },
    });

    let [transactionBuy, transactionSale] = await Promise.all([
      transactionP1,
      transactionP2,
    ]);
    return res
      .status(200)
      .json({ statusCode: 200, data: { transactionBuy, transactionSale } });
  } catch (error) {
    next(error);
  }
}

export async function getTransaction(req, res, next) {
  try {
    const transaction = await Transaction.findOne({
      transactionHash: req.params.txHash,
    });
    return res.status(200).json({ statusCode: 200, data: transaction });
  } catch (error) {
    next(error);
  }
}

export async function buyerAcceptTransaction(req, res, next) {
  try {
    const transaction = await Transaction.updateOne(
      {
        _id: req.params.idTransaction,
        "buyer.publicAddress": req.user.publicAddress,
      },
      { "buyer.$.isAccept": true },
      { new: true }
    );
    return res.status(200).json({ statusCode: 200, data: transaction });
  } catch (error) {
    next(error);
  }
}

export async function sellerAcceptTransaction(req, res, next) {
  try {
    const transaction = await Transaction.updateOne(
      {
        _id: req.params.idTransaction,
        "seller.publicAddress": req.user.publicAddress,
      },
      { "seller.$.isAccept": true },
      { new: true }
    );
    return res.status(200).json({ statusCode: 200, data: transaction });
  } catch (error) {
    next(error);
  }
}

export async function sellerRejectTransaction(req, res, next) {
  try {
    const transaction = await Transaction.updateOne(
      {
        _id: req.params.idTransaction,
        "seller.publicAddress": req.user.publicAddress,
      },
      { "seller.$.isAccept": false },
      { new: true }
    );
    return res.status(200).json({ statusCode: 200, data: transaction });
  } catch (error) {
    next(error);
  }
}

export async function buyerRejectTransaction(req, res, next) {
  try {
    const transaction = await Transaction.updateOne(
      {
        _id: req.params.idTransaction,
        "buyer.publicAddress": req.user.publicAddress,
      },
      { "buyer.$.isAccept": false },
      { new: true }
    );
    return res.status(200).json({ statusCode: 200, data: transaction });
  } catch (error) {
    next(error);
  }
}

/**
 * get all transactions of property ended =>  state CANCELED or PAYMENT_CONFIRMED
 */
export async function getAllTransactionsOfProperty(req, res, next) {
  try {
    const stateOfTransactionEnded = ["CANCELED", "PAYMENT_CONFIRMED"]; // this state => transaction possible modifier
    const idPropertyInBlockchain = req.params.idPropertyInBlockchain;
    const transaction = await Transaction.find({
      idPropertyInBlockchain,
      state: { $in: stateOfTransactionEnded },
    })
      .sort({ updatedAt: 1 }) // old to new
      .lean();
    if (transaction.length === 0) {
      throw new ErrorHandler(404, "Not found transaction");
    }
    return res.status(200).json({ statusCode: 200, data: transaction });
  } catch (error) {
    next(error);
  }
}
