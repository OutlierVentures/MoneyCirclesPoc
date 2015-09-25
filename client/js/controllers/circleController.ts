interface ICircleScope extends ng.IScope {
    circle: ICircle;
    vm: CircleController;
    processMessage: string;
    errorMessage: string;
    successMessage: string;
    totalInvestmentAmount: number;
    totalLoanAmount: number;
    /**
     * BitReserve cards to deposit from
     */
    cards: any;

    deposit: IDeposit;
    loan: ILoan;
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
        "$timeout",
        "$route",
        "$routeParams",
        "identityService"];

    constructor(
        private $scope: ICircleScope,
        private $rootScope: MoneyCirclesRootScope,
        private $http: ng.IHttpService,
        private $location: ng.ILocationService,
        private $window: ng.IWindowService,
        private $timeout: ng.ITimeoutService,
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
        } else if (this.$route.current.name === "loan-request") {
            this.startLoanRequest(circleId);
        }
    }

    private getCircleData(circleId: string, cb: any) {
        var t = this;

        // Get Circle data
        this.$http({
            method: 'GET',
            url: apiUrl + '/circle/' + circleId,
            headers: { AccessToken: t.$rootScope.userInfo.accessToken }
        }).success(function(resultData: ICircle) {
            t.$scope.circle = resultData;

            cb(null, resultData);
        }).error(function(error) {
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

        t.getCircleData(circleId, function(err, res) {
            // TODO: get these amounts
            // TODO: get more details about investments, members, outstanding loans
            t.$scope.totalInvestmentAmount = 0;
            t.$scope.totalLoanAmount = 0;
        });
    }

    create() {
        // TODO: check for validity
        var t = this;

        // Process creating a new Circle.
        t.$scope.processMessage = "Creating Circle... this may take a while because we're creating the smart contract that guarantees the correct and incorruptible functioning of your Circle.";
        t.$scope.errorMessage = undefined;
        t.$scope.successMessage = undefined;

        this.$http({
            method: 'POST',
            url: apiUrl + '/circle',
            data: t.$scope.circle,
            headers: { AccessToken: t.$rootScope.userInfo.accessToken }
        }).success(function(resultData: ICircle) {
            t.$scope.processMessage = undefined;
            t.$scope.errorMessage = undefined;
            t.$scope.circle = resultData;
            t.$scope.successMessage = "Your Circle '" + resultData.name + "' has been created successfully.";

            t.$timeout(() => {
            }, 5000).then((promiseValue) => {
                t.$scope.successMessage = undefined;

                // Redirect to the circle view
                t.$location.path("/circle/" + resultData._id);
            });
        }).error(function(error) {
            t.$scope.processMessage = undefined;

            // Handle error
            console.log("Error saving circle:");
            console.log(error);

            // Show notification
            t.$scope.errorMessage = error.error;
        });
    }

    /**
     * Show screen to join a circle.
     */
    join(circleId: string) {
        var t = this;

        t.getCircleData(circleId, function(err, res) {
        });
    }

    /**
     *
     */
    joinConfirm() {
        var t = this;

        // Confirm joining the currently loaded Circle.
        t.$scope.processMessage = "Joining Circle...";
        t.$scope.errorMessage = undefined;
        t.$scope.successMessage = undefined;

        this.$http({
            method: 'POST',
            url: apiUrl + '/circle/join',
            data: t.$scope.circle,
            headers: { AccessToken: t.$rootScope.userInfo.accessToken }
        }).success(function(resultData: any) {
            t.$scope.processMessage = undefined;
            t.$scope.successMessage = "You successfully joined! Taking you back to the Circle...";
            t.$timeout(() => {
            }, 5000).then((promiseValue) => {
                t.$scope.successMessage = undefined;

                // Redirect to the circle view
                t.$location.path("/circle/" + t.$scope.circle._id)
            });
        }).error(function(error) {
            t.$scope.processMessage = undefined;

            // Handle error
            console.log("Error confirming join:");
            console.log(error);

            // Show notification
            t.$scope.errorMessage = error;
        });
    }

    startDeposit(circleId: string) {
        var t = this;

        t.getCircleData(circleId, function(err, res) {
            if (err) {
            } else {
                // Get BitReserve cards with >0 funds
                // TODO: call in parallel; use promises for that.
                t.$http({
                    method: 'GET',
                    url: apiUrl + '/bitreserve/me/cards/withBalance',
                    headers: { AccessToken: t.$rootScope.userInfo.accessToken }
                }).success(function(cards: any) {
                    console.log("Success on BitReserve call through our API. Result:");
                    console.log(cards);

                    // Store in scope to show in view
                    t.$scope.cards = cards;
                }).error(function(error) {
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

        // Always use GBP at the moment.
        t.$scope.deposit.currency = "GBP";

        t.$scope.processMessage = "Processing your investment...";
        t.$scope.errorMessage = undefined;
        t.$scope.successMessage = undefined;

        this.$http({
            method: 'POST',
            url: apiUrl + '/circle/' + t.$scope.circle._id + '/deposit',
            data: t.$scope.deposit,
            headers: { AccessToken: t.$rootScope.userInfo.accessToken }
        }).success(function(resultData: IDeposit) {
            t.$scope.processMessage = undefined;

            t.$scope.deposit.amount = resultData.amount;
            t.$scope.deposit.transactionId = resultData.transactionId;
            t.$scope.successMessage = "You successfully invested " + resultData.currency + " " + resultData.amount + "! Taking you back to the Circle...";
            t.$timeout(() => {
            }, 10000).then((promiseValue) => {
                // Redirect to the circle view
                t.$scope.deposit = undefined;
                t.$scope.successMessage = undefined;
                t.$location.path("/circle/" + t.$scope.circle._id)
            });
        }).error(function(error) {
            t.$scope.processMessage = undefined;

            // Handle error
            console.log("Error confirming deposit:");
            console.log(error);

            // Show notification
            t.$scope.errorMessage = error.error;
        });
    }

    startLoanRequest(circleId: string) {
        var t = this;

        t.getCircleData(circleId, function(err, res) {
            if (err) {
            } else {
            }
        });
    }

    processLoanRequest() {
        var t = this;

        // Process a loan request to the currently loaded circle.

        // Always use GBP at the moment.
        t.$scope.loan.currency = "GBP";

        t.$scope.processMessage = "Requesting loan...";
        t.$scope.errorMessage = undefined;
        t.$scope.successMessage = undefined;

        this.$http({
            method: 'POST',
            url: apiUrl + '/circle/' + t.$scope.circle._id + '/loan',
            data: t.$scope.loan,
            headers: { AccessToken: t.$rootScope.userInfo.accessToken }
        }).success(function(resultData: ILoan) {
            t.$scope.processMessage = undefined;

            t.$scope.loan.amount = resultData.amount;
            t.$scope.loan.transactionId = resultData.transactionId;
            t.$scope.successMessage = "Your loan of " + resultData.currency + " " + resultData.amount + " was approved! The money has been transferred to your BitReserve account. Taking you back to the Circle...";
            t.$timeout(() => {
            }, 10000).then((promiseValue) => {
                // Redirect to the circle view
                t.$scope.loan = undefined;
                t.$scope.successMessage = undefined;
                t.$location.path("/circle/" + t.$scope.circle._id)
            });
        }).error(function(error) {
            // Handle error
            console.log("Error processing loan request:");
            console.log(error);

            // Show notification
            t.$scope.processMessage = undefined;
            t.$scope.errorMessage = error.error;
        });
    }
}
