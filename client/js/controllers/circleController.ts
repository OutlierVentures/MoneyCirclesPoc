interface ICircleScope {
    circle: ICircle;
    vm: CircleController;
}

class CircleController {
    public static $inject = [
        "$scope",
        "$rootScope",
        "$http",
        "$location",
        "$window",
        "$route",
        "identityService"];

    constructor(
        private $scope: ICircleScope,
        private $rootScope: MoneyCirclesRootScope,
        private $http: ng.IHttpService,
        private $location: ng.ILocationService,
        private $window: ng.IWindowService,
        private $route: ng.route.IRouteService,
        private identityService: IdentityService) {

        $scope.vm = this;
    }

    create() {
        // TODO: check for validity
        var t = this;

        this.$http({
            method: 'POST',
            url: apiUrl + '/circle',
            data: t.$scope.circle,
            headers: { AccessToken: t.$rootScope.userInfo.accessToken }
        }).success(function (resultData: any) {
            // Redirect to the circle view
            // TODO
            t.$location.path("/");

        }).error(function (error) {                
            // Handle error
            console.log("Error saving circle:");
            console.log(error);

            // TODO: show notification
        });
    }
}