/**
 * Identity provider for BitReserve using OAuth backend. The OAuth token is stored in the session storage.
 */
var BitReserveIdentityProvider = (function () {
    function BitReserveIdentityProvider() {
    }
    BitReserveIdentityProvider.prototype.getIdentifier = function () {
        // TODO: return user name/ID, not the token.
        return this._oauthToken;
    };
    BitReserveIdentityProvider.prototype.setUserInfo = function (userInfo, w) {
        this._userInfo = userInfo;
        if (w)
            w.sessionStorage.setItem('bitReserveUserInfo', JSON.stringify(userInfo));
    };
    BitReserveIdentityProvider.prototype.getUserInfo = function () {
        return this._userInfo;
    };
    BitReserveIdentityProvider.prototype.setToken = function (token, w) {
        this._oauthToken = token;
        // Store in session storage
        if (w)
            w.sessionStorage.setItem('bitReserveToken', token);
    };
    BitReserveIdentityProvider.prototype.isAuthenticated = function () {
        return this._oauthToken != null;
    };
    BitReserveIdentityProvider.prototype.logon = function () {
        // We only require a token to function. If it's not empty, we're good to go.
        // TODO: Could get oauth token from session storage here.
        return this._oauthToken != null;
    };
    BitReserveIdentityProvider.prototype.getPrivateKey = function () {
        return this._oauthToken;
    };
    BitReserveIdentityProvider.prototype.encrypt = function (unencryptedData) {
        return CryptoJS.AES.encrypt(unencryptedData, this.getPrivateKey()).toString();
    };
    BitReserveIdentityProvider.prototype.decrypt = function (encryptedData) {
        // TODO: check for errors
        // TODO: handle case that data is unencrypted, or encrypted with different alg
        return CryptoJS.AES.decrypt(encryptedData, this.getPrivateKey()).toString(CryptoJS.enc.Utf8);
    };
    return BitReserveIdentityProvider;
})();
/**
 * Service managing the identity of the user on the various backends.
 */
var IdentityService = (function () {
    function IdentityService($rootScope) {
        this.$rootScope = $rootScope;
        this.$inject = ['$rootScope'];
        this.providers = [];
    }
    /**
     * Logon with this provider.
     */
    IdentityService.prototype.logon = function (provider) {
        if (!provider.logon())
            return false;
        this.providers.push(provider);
        // The first successful provider is the primary one.
        if (!this.primaryProvider)
            this.primaryProvider = provider;
        this.$rootScope.userInfo = provider.getUserInfo();
        this.$rootScope.isLoggedIn = true;
        this.$rootScope.isProcessingLogin = false;
        this.$rootScope.$emit('loggedOn');
        return true;
    };
    IdentityService.prototype.logoff = function () {
        this.primaryProvider = null;
        this.providers = new Array();
    };
    IdentityService.prototype.isAuthenticated = function () {
        return this.primaryProvider && this.primaryProvider.isAuthenticated();
    };
    return IdentityService;
})();
//# sourceMappingURL=services.js.map