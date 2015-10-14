interface ILoanListScope {
    loans: Array<ICircle>;
    vm: LoanListController;
}

class LoanListController {
    public static $inject = [
        "$scope",
        "$rootScope",
        "$http",
        "$location",
        "$window",
        "$route",
        "identityService"];

    constructor(
        private $scope: ILoanListScope,
        private $rootScope: MoneyCirclesRootScope,
        private $http: ng.IHttpService,
        private $location: ng.ILocationService,
        private $window: ng.IWindowService,
        private $route: ng.route.IRouteService,
        private identityService: IdentityService) {

        $scope.vm = this;

        this.list();
    }

    list() {
        var t = this;

        this.$http({
            method: 'GET',
            url: apiUrl + '/loan',
            headers: { AccessToken: t.$rootScope.userInfo.accessToken }
        }).success(function (resultData: any) {
            t.$scope.loans = resultData;
        }).error(function (error) {                
            // Handle error
            console.log("Error getting loans:");
            console.log(error);

            // TODO: show notification
        });
    }
}