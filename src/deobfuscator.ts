import { LiteralStringExpression, BinaryExpression, Node, AssignmentExpression, ReturnStatement, SwitchCase, Expression, CallExpression, Script } from 'shift-ast';
import {isLiteral, refactor, RefactorSessionChainable} from 'shift-refactor';
import { Reference } from 'shift-scope';
const { commonMethods } = require('refactor-plugin-common');
import vm from'vm';
import fs from 'fs';


export class Deobfusactor {
    $script: RefactorSessionChainable
    vm: vm.Context
    concealFn: RefactorSessionChainable
    


    constructor(src: string) {
        this.$script = refactor(src, commonMethods)
        this.vm = vm.createContext({
            window: {}
        })
        this.concealFn = this.$script
        
    }

    

 
    deobfuscateMainChallenge() {
    
        this.loadMainChallengeContext()



        this.unconcealStringsMainChallenge()
        this.unconcealStringsMainChallenge()
    
        this.unflattenControlFlow()
        
        this.unconcealChStrings()
        this.simplifyProxyFunctions()

        return this.$script.codegen()[0]
    }
    traverseCases(state: any, stateVariableProperty: string, caseMap: any, defaultCases: any[]): any[] {
        let isStateChangeAssignment = function(n: Node) {
            return  (n.type=="ExpressionStatement" && 
            n.expression.type =="AssignmentExpression" && 
            n.expression.binding.type== "ComputedMemberAssignmentTarget" && 
            n.expression.binding.expression.type == "LiteralStringExpression" && 
            n.expression.binding.expression.value == stateVariableProperty)
        }
        let getStateChangeVal = function(n: Node) {
            if (n.type=="ExpressionStatement" && 
            n.expression.type =="AssignmentExpression" && 
            n.expression.binding.type== "ComputedMemberAssignmentTarget" && 
            n.expression.binding.expression.type == "LiteralStringExpression" && 
            n.expression.expression.type == "LiteralStringExpression" &&
            n.expression.binding.expression.value == stateVariableProperty)
            return n.expression.expression.value
        }
        let isChFunction = function(n: Node) {
            return (n.type=="ExpressionStatement" &&
                    n.expression.type=="CallExpression" &&
                    n.expression.callee.type == "FunctionExpression" &&
                    n.expression.callee.params.items[0].type=="BindingIdentifier" &&
                    n.expression.callee.params.items[0].name =="chl_done")
                    
            

            
        }

        let getChFunction = function(n: Node) {
            if (n.type=="ExpressionStatement" &&
                    n.expression.type=="CallExpression" &&
                    n.expression.callee.type == "FunctionExpression" &&
                    n.expression.callee.params.items[0].type=="BindingIdentifier" &&
                    n.expression.callee.params.items[0].name =="chl_done") {

                        return n
                        


                    }       
        }
        let getChStateChange = function(n: Node) {
            if (n.type=="ExpressionStatement" &&
                    n.expression.type=="CallExpression" &&
                    n.expression.callee.type == "FunctionExpression" &&
                    n.expression.callee.params.items[0].type=="BindingIdentifier" &&
                    n.expression.callee.params.items[0].name =="chl_done" &&
                    n.expression.arguments[0].type=="FunctionExpression") {

                    for (var i = 0; i < n.expression.arguments[0].body.statements.length; i++) {
                        let statement = n.expression.arguments[0].body.statements[i]
                        if (isStateChangeAssignment(statement)) {
                            return getStateChangeVal(statement)
                            
                        }

                    }
                    throw new Error("Failed to get ch state change")



            }  
        }



        let statements = caseMap[state]
        
        if (statements == undefined) {
            return defaultCases
        }

        let filteredStatements: any[] = []

  
        for (var i = 0; i < statements.length; i++) {
            let n = statements[i]
            if (isChFunction(n)) {
                filteredStatements.push(getChFunction(n))
                
                let newState = getChStateChange(n)
                console.log("FOUND NEW CHL_DONE STATE CHANGE: ", newState)
                filteredStatements.push(...this.traverseCases(newState, stateVariableProperty, caseMap, defaultCases))
                continue
            }
            
            if (isStateChangeAssignment(n)) {
                state = getStateChangeVal(n)
                continue
            }

            if (n.type != "BreakStatement" && n.type != "ReturnStatement") {
                filteredStatements.push(n)
            }

            if (n.type=="ReturnStatement") {
             
                return filteredStatements
            }
            //Do something
        }
   
        console.log("NEW STATE VALUE: ", state)
        filteredStatements.push(...this.traverseCases(state, stateVariableProperty, caseMap, defaultCases))

        return filteredStatements 
        
        
    }
    unconcealChStrings() {
        let possibleNodes = this.$script.query(`CallExpression[callee.property="split"]`)
        let concealFns =  possibleNodes.parents().parents().parents()

        for (var i = 0; i < concealFns.nodes.length; i++) {
            let stringManipulateFn = concealFns.nodes[i]
            
            if (stringManipulateFn.type == "BinaryExpression") {

                
                if (stringManipulateFn.right.type=="AssignmentExpression") {
                    let stringConcealFn = this.$script.$(stringManipulateFn)
                    vm.runInContext(stringConcealFn.codegen()[0], this.vm)

                    let references = this.$script.$(stringManipulateFn.right).references()
                    this.replaceStringConceal(references)

                    // stringConcealFn.delete()

                    

                } else if (stringManipulateFn.right.type=="FunctionExpression") {
                    let newConcealFn = this.$script.$(stringManipulateFn).parents()
                    vm.runInContext(newConcealFn.codegen()[0], this.vm)


                    let references = newConcealFn.references()
                    
                    this.replaceStringConceal(references)
                    // newConcealFn.delete()


                }
                

            } else {
                console.log(this.$script.$(stringManipulateFn).codegen())
                
                
            }
            
        } 

    }

    unflattenControlFlow() {

        let forSwitch = this.$script.query(`ForStatement[test.value="life goes on"]`).get(0)
    
        if (forSwitch.type =="ForStatement") {

            
            if (forSwitch.body.type=="SwitchStatementWithDefault" && forSwitch.body.discriminant.type=="ComputedMemberExpression" && forSwitch.body.discriminant.expression.type =="LiteralStringExpression") {
                
                let stateVariableProperty = forSwitch.body.discriminant.expression.value
            
                let state = vm.runInContext(this.$script.$(forSwitch.body.discriminant).codegen()[0], this.vm)
                let caseMap: any = {};
                forSwitch.body.preDefaultCases.forEach(function(c) {
                    if (c.test.type =="LiteralStringExpression") {
                        caseMap[c.test.value] = c.consequent
                    }
                    if (c.test.type =="IdentifierExpression") {
                        caseMap[c.test.name] = c.consequent
                    }
                    
                })
                let unflattenedFlow = this.traverseCases(state, stateVariableProperty, caseMap, forSwitch.body.defaultCase.consequent)
                let script = this.$script.get(0)
                if (script.type=="Script") {
                    script.statements = unflattenedFlow
                }
                

            }
           

        }
        


    }

    replaceStringConceal(references: Reference[]) {

     

        for (var j = 0; j < references.length; j++) {
            let ref = references[j]
            if (ref.accessibility.isRead) {

                let callExpression = this.$script.$(ref.node).parents().get(0)
                let retVal = vm.runInContext(this.$script.$(callExpression).codegen()[0], this.vm)

            

                this.$script.session.replace(callExpression, new LiteralStringExpression({
                    value: retVal,
                }))


            }
                
            
        }
    }

    loadMainChallengeContext() {
        let concealFn = this.$script.$(`StaticMemberAssignmentTarget[property="_"]`).parents().parents()
        
        
    
        vm.runInContext(concealFn.codegen()[0], this.vm)

        vm.runInContext("let _ = window._", this.vm)


    }
    unconcealStringsMainChallenge() {
        let $script = this.$script
        let context = this.vm

    
        this.$script.query(`ComputedMemberExpression[object.name="_"]`).replace(function(node) {
            
            let retVal = vm.runInContext($script.$(node).codegen()[0], context)

            if (retVal == undefined) {
                return node
            }
            return new LiteralStringExpression({
                value: retVal,
            })
            
        })
    }

    loadInitChallengeContext() {
        

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
            // @ts-ignore
            let fnDefinition = $script.$(node).parents().parents().parents().get(0)

         
            
            if (node.expression && node.expression.type=="BinaryExpression"&& fnDefinition.type == "AssignmentExpression" && fnDefinition.expression.type == "FunctionExpression" && fnDefinition.expression.params.items[0].type=="BindingIdentifier") {
                // if left side of binary expression is first paramater
                let binaryExpression: BinaryExpression  = node.expression

                if (fnDefinition.binding.type=="StaticMemberAssignmentTarget") { 

                    if (binaryExpression.left.type=="IdentifierExpression") {
                        if (binaryExpression.left.name == fnDefinition.expression.params.items[0].name && binaryExpression.left.name == fnDefinition.expression.params.items[0].name) {
                            $script.query(`CallExpression[callee.property="${fnDefinition.binding.property}"]`).forEach((node: CallExpression) => {
                                if (node.arguments[0].type!="SpreadElement" && node.arguments[1].type!="SpreadElement" ) {
                                    // console.log($script.$(node).codegen())

                                    let arg1: Expression = node.arguments[0]
                                    let arg2: Expression = node.arguments[1]
        
                                    
        
                                   
                                    // @ts-ignore
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
                    // @ts-ignore
                   node.expression
               )
            }


            // $script.session.delete(node)
            


        })

    }

   



}