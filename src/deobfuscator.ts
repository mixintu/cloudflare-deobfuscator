import { LiteralStringExpression, BinaryExpression, Node, AssignmentExpression, ReturnStatement, CallExpression, Expression } from 'shift-ast';
import {isLiteral, refactor, RefactorSessionChainable} from 'shift-refactor';
import { Reference } from 'shift-scope';
const { commonMethods } = require('refactor-plugin-common');
import vm from'vm';



export class Deobfusactor {
    $script: RefactorSessionChainable
    vm: vm.Context
    concealFn: RefactorSessionChainable

    constructor(src: string) {
        this.$script = refactor(src, commonMethods)
        this.vm = vm.createContext()
        this.concealFn = this.$script
  
    }

    

    

    loadContext() {
        

        let concealFn = this.$script.$(this.$script.$(`ReturnStatement[expression.right.type="IdentifierExpression"][expression.left.type="BinaryExpression"][expression.left.left.type="AssignmentExpression"]`).get(0)).parents().parents().parents()
        this.concealFn = concealFn
        
        let wholeContext = concealFn.parents()

        // this.$script.session.delete(wholeContext.get(0))
        vm.runInContext(wholeContext.codegen()[0], this.vm)

    }

    simplifyProxyFunctions() {
        // simplifies the following functiosn:


        // @ts-ignore
        this.$script.convertComputedToStatic()

        this.unconcealStringPropertyConceal()

        this.simplifyBinaryProxyFunctions()
        this.simplifyBinaryProxyFunctions()
    }
 
    private simplifyBinaryProxyFunctions() {
        let proxyFns = this.$script.query(`FunctionBody > ReturnStatement[expression.type="BinaryExpression"][expression.left.type="IdentifierExpression"][expression.right.type="IdentifierExpression"]`)
        let $script = this.$script
       

        proxyFns.forEach(function(node: ReturnStatement) {
            let fnDefinition = $script.$(node).parents().parents().parents().get(0)

         
            
            if (node.expression && node.expression.type=="BinaryExpression"&& fnDefinition.type == "AssignmentExpression" && fnDefinition.expression.type == "FunctionExpression" && fnDefinition.expression.params.items[0].type=="BindingIdentifier") {
                // if left side of binary expression is first paramater
                let binaryExpression: BinaryExpression  = node.expression

                if (fnDefinition.binding.type=="StaticMemberAssignmentTarget") { 

                    if (binaryExpression.left.type=="IdentifierExpression") {
                        if (binaryExpression.left.name == fnDefinition.expression.params.items[0].name && binaryExpression.left.name == fnDefinition.expression.params.items[0].name) {
                            $script.query(`CallExpression[callee.property="${fnDefinition.binding.property}"]`).forEach((node: CallExpression) => {
                                if (node.arguments[0].type!="SpreadElement" && node.arguments[1].type!="SpreadElement" ) {
                                    console.log($script.$(node).codegen())

                                    let arg1: Expression = node.arguments[0]
                                    let arg2: Expression = node.arguments[1]
        
                                    
        
                                   
        
                                    $script.session.replace(node, new BinaryExpression({
                                        left: arg1,
                                        right: arg2,
                                        operator: binaryExpression.operator,
                                    }))
                                }
                                
                            })
                        }
                    }
                   
                    
                    
                        
                        
                    
                }

                
            }
            
            
            
        })


    }

    private unconcealStringPropertyConceal() {
        let propertyConceals = this.$script.query(`AssignmentExpression[binding.type="StaticMemberAssignmentTarget"][binding.object.type="IdentifierExpression"][expression.type="LiteralStringExpression"]`)

        let $script = this.$script
       
        propertyConceals.forEach(function(node: AssignmentExpression) {
            
            if (node.binding.type=="StaticMemberAssignmentTarget") {
                $script.query(`StaticMemberExpression[property="${node.binding.property}"]`).replace(
                   
                   node.expression
               )
            }


            // $script.session.delete(node)
            


        })

    }

    unconcealStrings() {

        let $script = this.$script
        let context = this.vm
        this.concealFn.references().forEach(function(ref: Reference) {
            if (ref.accessibility.isRead) {

                let callExpression = $script.$(ref.node).parents().get(0)
                let retVal = vm.runInContext($script.$(callExpression).codegen()[0], context)

            

                $script.session.replace(callExpression, new LiteralStringExpression({
                    value: retVal,
                }))


            }
            
        })
    }



}