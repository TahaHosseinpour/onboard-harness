"""Exact arithmetic. Models are unreliable at maths, so numbers come from code."""

from __future__ import annotations

import ast
import math
import operator

from langchain_core.tools import tool

_BINARY = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.FloorDiv: operator.floordiv,
    ast.Mod: operator.mod,
    ast.Pow: operator.pow,
}
_UNARY = {ast.UAdd: operator.pos, ast.USub: operator.neg}
_FUNCTIONS = {"round": round, "abs": abs, "min": min, "max": max, "sum": lambda *xs: sum(xs), "sqrt": math.sqrt}


def _evaluate(node: ast.AST) -> float:
    """Walk the parsed expression, allowing numbers, arithmetic and a few named functions only."""
    if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)) and not isinstance(node.value, bool):
        return node.value
    if isinstance(node, ast.BinOp) and type(node.op) in _BINARY:
        left, right = _evaluate(node.left), _evaluate(node.right)
        if isinstance(node.op, ast.Pow) and abs(right) > 100:
            raise ValueError("exponent too large")
        return _BINARY[type(node.op)](left, right)
    if isinstance(node, ast.UnaryOp) and type(node.op) in _UNARY:
        return _UNARY[type(node.op)](_evaluate(node.operand))
    if isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id in _FUNCTIONS and not node.keywords:
        return _FUNCTIONS[node.func.id](*(_evaluate(arg) for arg in node.args))
    raise ValueError("only numbers, + - * / // % **, parentheses and round/abs/min/max/sum/sqrt are allowed")


def evaluate(expression: str) -> float:
    return _evaluate(ast.parse(expression.strip(), mode="eval").body)


@tool
def calculate(expression: str) -> str:
    """Evaluate an arithmetic expression exactly and return the result.

    Use this for every number you report: percentages, differences, totals.
    Supports + - * / // % **, parentheses, and round, abs, min, max, sum, sqrt.
    Example: calculate("(2840 - 3050) / 3050 * 100")
    """
    try:
        value = evaluate(expression)
    except ZeroDivisionError:
        return "Error: division by zero."
    except (ValueError, SyntaxError, TypeError) as error:
        return f"Error: cannot evaluate {expression!r} ({error})."
    return str(round(value, 6))
