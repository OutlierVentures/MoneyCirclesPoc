interface ICircleScope extends ng.IScope {
    circle: ICircle;
    vm: CircleController;
    errorMessage: string;
}

interface ICircleRouteParameters extends ng.route.IRouteParamsService {
    id: string;
}

class CircleController {
    public static $inject = [
        "$scope",
        "$rootScope",
        "$http",
        "$location",
        "$window",
        "$route",
        "$routeParams",
        "identityService"];

    constructor(
        private $scope: ICircleScope,
        private $rootScope: MoneyCirclesRootScope,
        private $http: ng.IHttpService,
        private $location: ng.ILocationService,
        private $window: ng.IWindowService,
        private $route: ng.route.IRouteService,
        private $routeParams: ICircleRouteParameters,
        private identityService: IdentityService) {

        $scope.vm = this;

        // Is this the best way to handle a path? Is there a good way to do something like Express i.e. (app.use("/my/route", class.MyFunction)?
        if ($location.path().indexOf("/circle/join") === 0) {
            var circleId = $routeParams.id;

            this.join(circleId);
        }
    }

    create() {
        // TODO: check for validity
        var t = this;

        this.$http({
            method: 'POST',
            url: apiUrl + '/circle',
            data: t.$scope.circle,
            headers: { AccessToken: t.$rootScope.userInfo.accessToken }
        }).success(function (resultData: ICircle) {
            // Redirect to the circle view
            t.$location.path("/circle/" + resultData._id);
        }).error(function (error) {                
            // Handle error
            console.log("Error saving circle:");
            console.log(error);

            // TODO: show notification
        });
    }

    /**
     * Show screen to join a circle.
     */
    join(circleId: string) {
        var t = this;
        
        // Get Circle data

        this.$http({
            method: 'GET',
            url: apiUrl + '/circle/' + circleId,
            data: t.$scope.circle,
            headers: { AccessToken: t.$rootScope.userInfo.accessToken }
        }).success(function (resultData: ICircle) {
            t.$scope.circle = resultData;
        }).error(function (error) {                
            // Handle error
            console.log("Error loading circle data:");
            console.log(error);

            // Show notification
            t.$scope.errorMessage = error.error;
        });
    }

    /**
     *
     */
    joinConfirm() {
        var t = this;

        // Confirm joining the currently loaded Circle.

        this.$http({
            method: 'POST',
            url: apiUrl + '/circle/join',
            data: t.$scope.circle,
            headers: { AccessToken: t.$rootScope.userInfo.accessToken }
        }).success(function (resultData: any) {
            // Redirect to the circle view
            t.$location.path("/circle/" + t.$scope.circle._id);
        }).error(function (error) {                
            // Handle error
            console.log("Error confirming join:");
            console.log(error);

            // Show notification
            t.$scope.errorMessage = error.error;
        });
    }
}