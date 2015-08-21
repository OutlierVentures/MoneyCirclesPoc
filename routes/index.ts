/*
 * GET home page.
 */
import express = require('express');
import path = require('path');

export function index(req: express.Request, res: express.Response) {
    res.sendFile('index.html');
};