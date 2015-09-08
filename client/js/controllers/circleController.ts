interface ICircleScope extends ng.IScope {
    circle: ICircle;
    vm: CircleController;
    errorMessage: string;
    totalInvestmentAmount: number;
    totalLoanAmount: number;
    /**
     * BitReserve cards to deposit from 
     */
    cards: any;

    deposit: IDeposit;
}

interface IDeposit {
    fromCard: string;
    amount: string;
    currency: string;
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

        var circleId = this.$routeParams.id;

        // This controller serves multiple actions. We distinguish the action by the template.

        // TODO: Is this the best way to handle a path? Is there a good way to do something like 
        // Express i.e. (app.use("/my/route", class.MyFunction) ?
        if (this.$route.current.name === "join") {
            this.join(circleId);
        } else if (this.$route.current.name === "details") {
            this.view(circleId);
        } else if (this.$route.current.name === "deposit") {
            this.startDeposit(circleId);
        }
    }

    private getCircleData(circleId: string, cb: any) {
        var t = this;

        // Get Circle data
        this.$http({
            method: 'GET',
            url: apiUrl + '/circle/' + circleId,
            headers: { AccessToken: t.$rootScope.userInfo.accessToken }
        }).success(function (resultData: ICircle) {
            t.$scope.circle = resultData;

            cb(null, resultData);
        }).error(function (error) {                
            // Handle error
            console.log("Error loading circle data:");
            console.log(error);

            // Show notification
            t.$scope.errorMessage = error.error;

            cb("Error getting circle data", null);
        });

    }

    view(circleId: string) {
        var t = this;

        t.getCircleData(circleId, function (err, res) {
            // TODO: get these amounts
            // TODO: get more details about investments, members, outstanding loans
            t.$scope.totalInvestmentAmount = 0;
            t.$scope.totalLoanAmount = 0;
        });
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

        t.getCircleData(circleId, function (err, res) {
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

    startDeposit(circleId: string) {
        var t = this;

        t.getCircleData(circleId, function (err, res) {
            if (err) {
            } else {
                // Get BitReserve cards with >0 funds
                // TODO: call in parallel; use promises for that.                
                t.$http({
                    method: 'GET',
                    url: apiUrl + '/bitreserve/me/cards/withBalance',
                    headers: { AccessToken: t.$rootScope.userInfo.accessToken }
                }).success(function (cards: any) {
                    console.log("Success on BitReserve call through our API. Result:");
                    console.log(cards);

                    // Store in scope to show in view
                    t.$scope.cards = cards;
                }).error(function (error) {                
                    // Handle error
                    console.log("Error on BitReserve call through our API:");
                    console.log(error);

                    // TODO: further handling
                });
            }
        });
    }

    confirmDeposit() {
        var t = this;

        // Confirm a deposit to the currently loaded circle.

        this.$http({
            method: 'POST',
            url: apiUrl + '/circle/' + t.$scope.circle._id + '/deposit',
            data: t.$scope.deposit,
            headers: { AccessToken: t.$rootScope.userInfo.accessToken }
        }).success(function (resultData: any) {
            // Redirect to the circle view
            t.$location.path("/circle/" + t.$scope.circle._id);
        }).error(function (error) {                
            // Handle error
            console.log("Error confirming deposit:");
            console.log(error);

            // Show notification
            t.$scope.errorMessage = error.error;
        });

    }
}