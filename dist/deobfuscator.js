"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Deobfusactor = void 0;
const shift_ast_1 = require("shift-ast");
const shift_refactor_1 = require("shift-refactor");
const { commonMethods } = require('refactor-plugin-common');
const vm_1 = __importDefault(require("vm"));
class Deobfusactor {
    constructor(src) {
        this.$script = (0, shift_refactor_1.refactor)(src, commonMethods);
        this.vm = vm_1.default.createContext();
        this.concealFn = this.$script;
    }
    loadContext() {
        let concealFn = this.$script.$(this.$script.$(`ReturnStatement[expression.right.type="IdentifierExpression"][expression.left.type="BinaryExpression"][expression.left.left.type="AssignmentExpression"]`).get(0)).parents().parents().parents();
        this.concealFn = concealFn;
        let wholeContext = concealFn.parents();
        // this.$script.session.delete(wholeContext.get(0))
        vm_1.default.runInContext(wholeContext.codegen()[0], this.vm);
    }
    simplifyProxyFunctions() {
        // simplifies the following functiosn:
        // @ts-ignore
        this.$script.convertComputedToStatic();
        this.unconcealStringPropertyConceal();
        this.simplifyBinaryProxyFunctions();
        this.simplifyBinaryProxyFunctions();
    }
    simplifyBinaryProxyFunctions() {
        let proxyFns = this.$script.query(`FunctionBody > ReturnStatement[expression.type="BinaryExpression"][expression.left.type="IdentifierExpression"][expression.right.type="IdentifierExpression"]`);
        let $script = this.$script;
        proxyFns.forEach(function (node) {
            let fnDefinition = $script.$(node).parents().parents().parents().get(0);
            if (node.expression && node.expression.type == "BinaryExpression" && fnDefinition.type == "AssignmentExpression" && fnDefinition.expression.type == "FunctionExpression" && fnDefinition.expression.params.items[0].type == "BindingIdentifier") {
                // if left side of binary expression is first paramater
                let binaryExpression = node.expression;
                if (fnDefinition.binding.type == "StaticMemberAssignmentTarget") {
                    if (binaryExpression.left.type == "IdentifierExpression") {
                        if (binaryExpression.left.name == fnDefinition.expression.params.items[0].name && binaryExpression.left.name == fnDefinition.expression.params.items[0].name) {
                            $script.query(`CallExpression[callee.property="${fnDefinition.binding.property}"]`).forEach((node) => {
                                if (node.arguments[0].type != "SpreadElement" && node.arguments[1].type != "SpreadElement") {
                                    console.log($script.$(node).codegen());
                                    let arg1 = node.arguments[0];
                                    let arg2 = node.arguments[1];
                                    $script.session.replace(node, new shift_ast_1.BinaryExpression({
                                        left: arg1,
                                        right: arg2,
                                        operator: binaryExpression.operator,
                                    }));
                                }
                            });
                        }
                    }
                }
            }
        });
    }
    unconcealStringPropertyConceal() {
        let propertyConceals = this.$script.query(`AssignmentExpression[binding.type="StaticMemberAssignmentTarget"][binding.object.type="IdentifierExpression"][expression.type="LiteralStringExpression"]`);
        let $script = this.$script;
        propertyConceals.forEach(function (node) {
            if (node.binding.type == "StaticMemberAssignmentTarget") {
                $script.query(`StaticMemberExpression[property="${node.binding.property}"]`).replace(node.expression);
            }
            $script.session.delete(node);
        });
    }
    unconcealStrings() {
        let $script = this.$script;
        let context = this.vm;
        this.concealFn.references().forEach(function (ref) {
            if (ref.accessibility.isRead) {
                let callExpression = $script.$(ref.node).parents().get(0);
                let retVal = vm_1.default.runInContext($script.$(callExpression).codegen()[0], context);
                $script.session.replace(callExpression, new shift_ast_1.LiteralStringExpression({
                    value: retVal,
                }));
            }
        });
    }
}
exports.Deobfusactor = Deobfusactor;
