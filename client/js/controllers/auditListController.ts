interface IAuditListScope {
    items: IAuditListItem[];
    totals: ICircleStatistics;
    vm: AuditListController;
}

class AuditListController {
    public static $inject = [
        "$scope",
        "$rootScope",
        "$http",
        "$location",
        "$window",
        "$route",
        "identityService"];

    constructor(
        private $scope: IAuditListScope,
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
            url: apiUrl + '/audit/circle',
            // Anonymous method
            //headers: { AccessToken: t.$rootScope.userInfo.accessToken }
        }).success(function (resultData: IAuditList) {
            t.$scope.items = resultData.items;
            t.$scope.totals = resultData.totals;
        }).error(function (error) {                
            // Handle error
            console.log("Error getting loans:");
            console.log(error);

            // TODO: show notification
        });
    }
}