interface ILoanScope extends ng.IScope {
    loan: ILoan;
    vm: LoanController;
    processMessage: string;
    errorMessage: string;
    successMessage: string;
    repayment: {
        fromCard: string;
    }
    /**
     * BitReserve cards to deposit from
     */
    cards: any;
}

interface ILoanRouteParameters extends ng.route.IRouteParamsService {
    id: string;
}

class LoanController {
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
        private $scope: ILoanScope,
        private $rootScope: MoneyCirclesRootScope,
        private $http: ng.IHttpService,
        private $location: ng.ILocationService,
        private $window: ng.IWindowService,
        private $timeout: ng.ITimeoutService,
        private $route: ng.route.IRouteService,
        private $routeParams: ICircleRouteParameters,
        private identityService: IdentityService) {

        $scope.vm = this;

        var loanId = this.$routeParams.id;

        // This controller serves multiple actions. We distinguish the action by a 'name' which
        // is set in the route configuration in app.ts.
        if (this.$route.current.name === "repay") {
            this.startRepayment(loanId);
        }
    }

    private getLoanData(circleId: string, cb: any) {
        var t = this;

        // Get Loan data
        this.$http({
            method: 'GET',
            url: apiUrl + '/loan/' + circleId,
            headers: { AccessToken: t.$rootScope.userInfo.accessToken }
        }).success(function (resultData: ILoan) {
            t.$scope.loan = resultData;

            cb(null, resultData);
        }).error(function (error) {
            // Handle error
            console.log("Error loading loan data:");
            console.log(error);

            // Show notification
            t.$scope.errorMessage = error.error;

            cb("Error getting loan data", null);
        });

    }

    //view(loanId: string) {
    //    var t = this;

    //    t.getLoanData(loanId, function(err, res) {
    //    });
    //}


    startRepayment(loanId: string) {
        var t = this;

        t.getLoanData(loanId, function (err, res) {
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

    confirmRepayment() {
        var t = this;

        // Confirm a repayment to the currently loaded loan.
        t.$scope.processMessage = "Processing your repayment...";
        t.$scope.errorMessage = undefined;
        t.$scope.successMessage = undefined;

        this.$http({
            method: 'POST',
            url: apiUrl + '/loan/' + t.$scope.loan._id + '/repay',
            data: t.$scope.loan,
            headers: { AccessToken: t.$rootScope.userInfo.accessToken }
        }).success(function (resultData: ILoan) {
            t.$scope.processMessage = undefined;

            t.$scope.loan.repaymentTransactionId = resultData.transactionId;
            t.$scope.successMessage = "You successfully repaid your loan of " + resultData.currency + " " + resultData.amount + "! Taking you back to the Circle...";
            t.$timeout(() => {
            }, 10000).then((promiseValue) => {
                // Redirect to the circle view
                t.$scope.repayment = undefined;
                t.$scope.successMessage = undefined;
                t.$location.path("/circle/" + t.$scope.loan.circleId)
            });
        }).error(function (error) {
            t.$scope.processMessage = undefined;

            // Handle error
            console.log("Error confirming repayment:");
            console.log(error);

            // Show notification
            t.$scope.errorMessage = error.error;
        });
    }
}