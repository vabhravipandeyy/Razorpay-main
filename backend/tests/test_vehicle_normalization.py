import pytest
from app.core.vehicle import normalize_vehicle_number


def test_vehicle_normalization_standard():
    assert normalize_vehicle_number("KA01AB1234") == "KA01AB1234"


def test_vehicle_normalization_lowercase():
    assert normalize_vehicle_number("ka01ab1234") == "KA01AB1234"


def test_vehicle_normalization_with_spaces():
    assert normalize_vehicle_number("KA 01 AB 1234") == "KA01AB1234"
    assert normalize_vehicle_number(" KA01AB1234 ") == "KA01AB1234"
    assert normalize_vehicle_number("  DL   04   C   9999  ") == "DL04C9999"


def test_vehicle_normalization_with_hyphens_and_dots():
    assert normalize_vehicle_number("MH-12-DE-1433") == "MH12DE1433"
    assert normalize_vehicle_number("HR.26.BR.9044") == "HR26BR9044"


def test_vehicle_normalization_empty_and_none():
    assert normalize_vehicle_number("") == ""
    assert normalize_vehicle_number(None) == ""
    assert normalize_vehicle_number("   ") == ""
