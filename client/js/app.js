/// <reference path="../typings/tsd.d.ts" />
/**
 * URL of the backend API. Could be derived from our URL, but OTOH the API could be split from the client
 * and for that case it's better to have it separately.
 */
// TODO: make configurable.
var apiUrl = "https://localhost:3124/api";
var MoneyCircles;
(function (MoneyCircles) {
    'use strict';
    // All controllers are registered here.
    var moneyCirclesApp = angular.module('moneyCirclesApp', ['ngResource', 'ngRoute', 'ngSanitize', 'angularMoment'])
        .controller('NavigationController', NavigationController)
        .controller('LoginController', LoginController)
        .controller('UserAccountController', UserAccountController);
    moneyCirclesApp.config(function ($routeProvider, $locationProvider) {
        $routeProvider
            .when('/', { controller: DashboardController, templateUrl: 'views/dashboard.html' })
            .when('/auth/bitreserve/callback', { controller: LoginController, templateUrl: 'views/oauth-callback.html' })
            .when('/user/login', { controller: LoginController, templateUrl: 'views/oauth-callback.html' })
            .when('/not-found', { templateUrl: 'views/not-found.html' })
            .otherwise({ redirectTo: 'not-found' });
        $locationProvider.html5Mode(true);
        $locationProvider.hashPrefix('!');
    });
    // Note: the string name provided to angular has to match the parameter names as used in the controllers,
    // case-sensitive. 
    moneyCirclesApp.service('identityService', IdentityService);
})(MoneyCircles || (MoneyCircles = {}));
/**
 * Shorthand method for getting an Angular service from the debug console.
 */
function angularGetService(serviceName) {
    return angular.element(document.querySelector('.ng-scope')).injector().get(serviceName);
}
//# sourceMappingURL=app.js.map