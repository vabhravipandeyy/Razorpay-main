import re
from typing import Optional


def normalize_vehicle_number(vehicle_number: Optional[str]) -> str:
    """
    Standardize Indian vehicle registration numbers.
    
    Operations:
    1. Strip leading/trailing whitespace
    2. Convert to uppercase
    3. Remove spaces, hyphens, and dots (e.g. 'KA 01 AB 1234' -> 'KA01AB1234')
    
    Preserves raw vehicle values in database; use for matching and searching.
    """
    if not vehicle_number:
        return ""
    
    # Strip whitespace and convert to upper
    cleaned = vehicle_number.strip().upper()
    
    # Remove all spaces, hyphens, dots, and common separators
    cleaned = re.sub(r"[\s\-\.]+", "", cleaned)
    
    return cleaned
