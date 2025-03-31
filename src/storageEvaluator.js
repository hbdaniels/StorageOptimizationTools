export default function evaluateRule(rule, context) {
    if (!rule || rule.enabled === "false") return null;
  
    console.log("Evaluating rule:", rule);
    console.log("Context:", context);
  
    if (rule.condition) {
        const condFn = prepareExpression(rule.condition, context);
        const result = safeEval(condFn);
  
      if (result) {
        return evaluateRule(rule.then, context);
      } else if (rule.else) {
        return evaluateRule(rule.else, context);
      } else {
        return null;
      }
    }
  
    if (rule.action) {
        const actionFn = prepareExpression(rule.action, context);
        return safeEval(actionFn);
      }
  
    if (rule.then) return evaluateRule(rule.then, context);
    if (rule.else) return evaluateRule(rule.else, context);
  
    return null;
  }
  
  function safeEval(fn) {
    try {
      return fn(); // ← It's a function returned from prepareExpression
    } catch (e) {
      console.warn("Eval error:", e.message);
      return null;
    }
  }
  
  
  function prepareExpression(expr, context) {
    const sandbox = {
      StartsWith: (str, prefix) => str.startsWith(prefix),
      ConvertToDecimal: (ch) => {
        if (!ch) return 0;
        if (typeof ch !== 'string') return parseInt(ch);
        return ch.charCodeAt(0) - 64;
      },
      IsInAttribute: (sprite, attr) => {
        const attrs = sprite.attributes || [];
        return attrs.some(a => a.name === attr);
      },
      ...context
    };
  
    const keys = Object.keys(sandbox);
    const values = Object.values(sandbox);
  
    try {
      return Function(...keys, `"use strict"; return (${expr})`).bind(null, ...values);
    } catch (e) {
      console.warn("Expression preparation failed:", expr);
      return () => null;
    }
  }
  