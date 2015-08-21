import express = require("express");
import mongoose = require("mongoose");
import userModel = require("../models/userModel");

import IUser = userModel.IUser;
import repository = userModel.repository;

export function createUser(req: express.Request, res: express.Response) {
    var userName = req.params.name;

    repository.create({ name: userName }, (error) => {
        if (error) {
            res.send(400);
        } else {
            res.send("user " + userName + " created");
        }
    });
}

export function retrieveUser(req: express.Request, res: express.Response) {
    var userName = req.params.name;

    repository.findOne({ name: userName }, (error, user) => {
        if (error) {
            res.send(400);
        } else {
            res.send("user name " + user.name + " retrieved");
        }
    });
}

export var model = userModel;