interface IApplicationConfig {
    "server": {
        "httpPort": number,
        "httpsPort": number,
        "baseUrl": string
    },
    "database": {
        "url": string
    },
    "bitReserve": {
        "app": {
            "clientID": string,
            "clientSecret": string
        },
        "circleVaultAccount": {
            "userName": string
        }
    },
    "ethereum": {
        "jsonRpcUrl": string,
        "nodeUrl": string
    }
}
