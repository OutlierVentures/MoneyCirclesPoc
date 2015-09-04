import express = require("express");
import bitReserveService = require("../services/bitReserveService");

export class BitReserveController {
    getCards(req: express.Request, res: express.Response) {
        var token = req.header("AccessToken");

        var brs = new bitReserveService.BitReserveService(token);

        brs.getCards(function (err, cards) {
            if (err) {
                res.json(500,
                    {
                        "status": "Error",
                        "error": err,
                    });
            } else {
                res.json(cards);
            }
        });
    }
}