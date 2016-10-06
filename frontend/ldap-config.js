(function() {
    'use strict';

    var LdapConfig = {
        url: 'ldap://111.111.111:389',
        bindDn: 'cn=root',
        bindCredentials: 'secret',
        searchBase: 'ou=passport-ldapauth',
        searchFilter: '(uid={{username}})'
    };

    module.exports = LdapConfig;
})();
