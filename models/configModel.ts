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
        "mainAccount": {
            "userName": string
        }
    },
    "ethereum": {
        "jsonRpcUrl"
    }
}
