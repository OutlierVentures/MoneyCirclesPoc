/**
 * Controller for the logon box.
 */
var LoginController = (function () {
    function LoginController($scope, $rootScope, $http, $location, $window, $route, identityService) {
        this.$scope = $scope;
        this.$rootScope = $rootScope;
        this.$http = $http;
        this.$location = $location;
        this.$window = $window;
        this.$route = $route;
        this.identityService = identityService;
        $scope.isAuthenticated = function () {
            return identityService.isAuthenticated();
        };
        // See if sessionStorage contains valid login info. If so, we can consider the user to be logged in.
        var tokenFromSession = $window.sessionStorage.getItem("bitReserveToken");
        var userStringFromSession = $window.sessionStorage.getItem("bitReserveUserInfo");
        // We prefer a login from the session, even when processing the callback from the OAuth provider. If the 
        // token is stale, it should be cleared before a new login attempt.
        // TODO: detect that token is stale/incorrect and clear it.
        if (tokenFromSession && userStringFromSession
            && !this.$scope.isAuthenticated()) {
            // Restore from session
            var userDataFromSession = JSON.parse(userStringFromSession);
            var brip = new BitReserveIdentityProvider();
            brip.setToken(tokenFromSession, null);
            brip.setUserInfo(userDataFromSession, null);
            // Log on with it
            identityService.logon(brip);
            // Store in scope to show in view
            $scope.userInfo = userDataFromSession;
        }
        else if (this.$location.path() == "/auth/bitreserve/callback"
            && !this.$scope.isAuthenticated()
            && !this.$rootScope.isProcessingLogin) {
            this.$rootScope.isProcessingLogin = true;
            // Handle OAuth callback
            // Get code and scope
            var queryString = $location.search();
            $window.location.search;
            var code = queryString["code"];
            var state = queryString["state"];
            var theParams = {
                'code': code,
                'state': state
            };
            if (queryString["error"]) {
                // TODO: handle error here.
                theParams["error"] = queryString["error"];
            }
            var t = this;
            // Call API /auth/bitreserve/callback
            $http({
                method: 'POST',
                url: apiUrl + '/auth/bitreserve/callback',
                data: theParams
            }).success(function (resultData) {
                console.log("Successful call to OAuth callback on API. Result:");
                console.log(resultData);
                // Store token in BitReserve identity provider
                var brip = new BitReserveIdentityProvider();
                brip.setToken(resultData.user.accessToken, $window);
                brip.setUserInfo(resultData.user, $window);
                // Log on with it
                identityService.logon(brip);
                // Store in scope to show in view
                $scope.userInfo = resultData.user;
            }).error(function (error) {
                // Handle error
                console.log("Error on OAuth callback to API:");
                console.log(error);
                $rootScope.isProcessingLogin = false;
                // Workaround to show login error message: use root scope. This really belongs in the LoginController, but:
                // * The only visible part is a static template (<div ng-include="'views/login.html'" ng-hide="isLoggedIn"></div>)
                // * The logon controller loads its template in the <div ng-view></div> like any other controller. This div
                //   is NOT visible while not logged on.
                $rootScope.loginErrorMessage = "There was an error processing your login. Please try again. Details: " + error.error.error;
            });
        }
    }
    LoginController.$inject = [
        "$scope",
        "$rootScope",
        "$http",
        "$location",
        "$window",
        "$route",
        "identityService"];
    return LoginController;
})();
var DashboardController = (function () {
    function DashboardController($scope, $rootScope, $location, $http) {
        this.$scope = $scope;
        this.$rootScope = $rootScope;
        this.$location = $location;
        this.$http = $http;
        var t = this;
        // Reset any logon errors once we're logged in.
        $rootScope.loginErrorMessage = undefined;
        if ($rootScope.isLoggedIn) {
            t.loadData();
        }
        // The logon could happen while the controller is already loaded.
        $rootScope.$on('loggedOn', function () {
            t.loadData();
        });
    }
    DashboardController.prototype.loadData = function () {
        var t = this;
        t.$scope.userInfo = t.$rootScope.userInfo;
        t.loadBitReserveData();
    };
    DashboardController.prototype.loadBitReserveData = function () {
        // Load BitReserve data        
        var t = this;
        this.$http({
            method: 'GET',
            url: apiUrl + '/bitreserve/me/cards',
            headers: { AccessToken: t.$scope.userInfo.accessToken }
        }).success(function (cards) {
            console.log("Success on BitReserve call through our API. Result:");
            console.log(cards);
            // Store in scope to show in view
            t.$scope.allCards = cards;
        }).error(function (error) {
            // Handle error
            console.log("Error on BitReserve call through our API:");
            console.log(error);
        });
    };
    DashboardController.$inject = [
        "$scope",
        "$rootScope",
        "$location",
        "$http"];
    return DashboardController;
})();
var NavigationController = (function () {
    function NavigationController($scope, $location) {
        this.$scope = $scope;
        this.$location = $location;
    }
    NavigationController.$inject = [
        "$scope",
        "$location"];
    return NavigationController;
})();
var UserAccountController = (function () {
    function UserAccountController($scope, $rootScope, $location) {
        this.$scope = $scope;
        this.$rootScope = $rootScope;
        this.$location = $location;
        this.$rootScope.$on('loggedOn', function (event, data) {
            $scope.userInfo = $rootScope.userInfo;
        });
    }
    UserAccountController.$inject = [
        "$scope",
        "$rootScope",
        "$location"];
    return UserAccountController;
})();
//# sourceMappingURL=controllers.js.map