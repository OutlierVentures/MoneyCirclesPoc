import express = require("express");
import controller = require("../controllers/userController");
 
/*
 * User Routes
 */
export function list(req: express.Request, res: express.Response) {
    res.send("respond a resource");
};

export function create(req: express.Request, res: express.Response) {
    controller.createUser(req, res);
};

export function read(req: express.Request, res: express.Response) {
    controller.retrieveUser(req, res);
};