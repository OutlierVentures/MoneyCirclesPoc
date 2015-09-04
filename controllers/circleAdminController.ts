import express = require("express");
import circleModel = require('../models/circleModel');

/**
 * Controller for Circle admin operations.
 */
export class CircleAdminController {
    create(req: express.Request, res: express.Response) {
        var token = req.header("AccessToken");

        var circleData = req.body;
        circleModel.Circle.create(circleData, (err, circleRes) => {
            res.send(circleRes);
        });
    }
}