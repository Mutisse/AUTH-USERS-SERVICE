"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserStatus = exports.EmployeeSubRole = exports.UserMainRole = void 0;
var UserMainRole;
(function (UserMainRole) {
    UserMainRole["CLIENT"] = "client";
    UserMainRole["EMPLOYEE"] = "employee";
    UserMainRole["ADMINSYSTEM"] = "admin_system";
})(UserMainRole || (exports.UserMainRole = UserMainRole = {}));
var EmployeeSubRole;
(function (EmployeeSubRole) {
    EmployeeSubRole["SALON_OWNER"] = "salon_owner";
    EmployeeSubRole["MANAGER"] = "manager";
    EmployeeSubRole["STAFF"] = "staff";
    EmployeeSubRole["RECEPTIONIST"] = "receptionist";
})(EmployeeSubRole || (exports.EmployeeSubRole = EmployeeSubRole = {}));
var UserStatus;
(function (UserStatus) {
    UserStatus["ACTIVE"] = "active";
    UserStatus["INACTIVE"] = "inactive";
    UserStatus["SUSPENDED"] = "suspended";
    UserStatus["PENDING"] = "pending";
    UserStatus["PENDING_VERIFICATION"] = "pending_verification";
    UserStatus["VERIFIED"] = "verified";
    UserStatus["BLOCKED"] = "blocked";
    UserStatus["DELETED"] = "deleted";
    UserStatus["ONBOARDING"] = "onboarding";
    UserStatus["PROFILE_SETUP"] = "profile_setup";
    UserStatus["PAYMENT_PENDING"] = "payment_pending";
    UserStatus["TRIAL"] = "trial";
    UserStatus["EXPIRED"] = "expired";
})(UserStatus || (exports.UserStatus = UserStatus = {}));
