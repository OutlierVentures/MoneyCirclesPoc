/// <reference path="../typings/tsd.d.ts" />

/**
 * URL of the backend API. Could be derived from our URL, but OTOH the API could be split from the client
 * and for that case it's better to have it separately.
 */
// TODO: make configurable.
var apiUrl = "https://localhost:3124/api";

interface MoneyCirclesRootScope extends ng.IRootScopeService {
    isLoggedIn: boolean;
    // The variables below belong in the login controller. Currently placed here as a workaround to be able to show error
    // message while logging in.
    isProcessingLogin: boolean;
    loginErrorMessage: string;
    userInfo: IUser;
}

module MoneyCircles {
    'use strict';

    // All controllers are registered here.
    var moneyCirclesApp = angular.module('moneyCirclesApp', ['ngResource', 'ngRoute', 'ngSanitize', 'angularMoment'])
        .controller('NavigationController', NavigationController)
        .controller('LoginController', LoginController)
        .controller('UserAccountController', UserAccountController)

    moneyCirclesApp.config(function ($routeProvider: ng.route.IRouteProvider, $locationProvider: ng.ILocationProvider) {
        $routeProvider
            .when('/', { controller: DashboardController, templateUrl: 'views/dashboard.html' })
            .when('/auth/bitreserve/callback', { controller: LoginController, templateUrl: 'views/oauth-callback.html' })
            //.when('/user/profile', { controller: UserAccountController, templateUrl: 'views/user-profile.html' })
            .when('/user/login', { controller: LoginController, templateUrl: 'views/oauth-callback.html' })
            .when('/not-found', { templateUrl: 'views/not-found.html' })
            .otherwise({ redirectTo: 'not-found' });
        $locationProvider.html5Mode(true);
        $locationProvider.hashPrefix('!');
    })

    // Note: the string name provided to angular has to match the parameter names as used in the controllers,
    // case-sensitive. 
    moneyCirclesApp.service('identityService', IdentityService);
}

/**
 * Shorthand method for getting an Angular service from the debug console.
 */
function angularGetService(serviceName: string) {
    return angular.element(document.querySelector('.ng-scope')).injector().get(serviceName);
}