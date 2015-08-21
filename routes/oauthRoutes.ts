import express = require("express");
import controller = require("../controllers/oauthController");
 
/*
 * User Routes
 */
export function auth(req: express.Request, res: express.Response) {
    controller.auth(req, res);
};

export function callback(req: express.Request, res: express.Response) {
    controller.callback(req, res);
};
