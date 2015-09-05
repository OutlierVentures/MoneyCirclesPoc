import express = require("express");
import circleModel = require('../models/circleModel');

/**
 * Controller for Circle admin operations.
 */
export class CircleAdminController {
    create(req: express.Request, res: express.Response) {
        var token = req.header("AccessToken");

        // TODO: check security
        // TODO: store user as first admin of circle

        var circleData = req.body;
        circleModel.Circle.create(circleData, (err, circleRes) => {
            res.send(circleRes);
        });
    }
}