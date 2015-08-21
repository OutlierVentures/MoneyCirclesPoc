/*
 * GET home page.
 */
import express = require('express');
import path = require('path');

export function index(req: express.Request, res: express.Response) {
    // TODO: check whether we already have an authorization token for the user.
    res.sendFile('index.html');
};