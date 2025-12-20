"""
Data Node Executors
"""
import json
import csv
import io
import xml.etree.ElementTree as ET
from typing import Any, Dict, List
from datetime import datetime
import logging
from ..nodes.base import BaseNodeExecutor

logger = logging.getLogger(__name__)


class JsonParseExecutor(BaseNodeExecutor):
    """
    JSON Parse Node - Parses JSON strings
    """
    
    def get_required_config_fields(self) -> List[str]:
        return ["jsonString"]
    
    def _validate_custom_config(self) -> List[str]:
        errors = []
        config = self.config.config
        
        json_string = config.get("jsonString", "")
        if json_string:
            try:
                json.loads(json_string)
            except json.JSONDecodeError as e:
                errors.append(f"Invalid JSON: {str(e)}")
        
        return errors
    
    async def _execute_impl(self, input_data: Any) -> Any:
        """
        Parse JSON string.
        """
        config = self.config.config
        json_string = config.get("jsonString", "")
        
        # If jsonString is not provided, try to get it from input_data
        if not json_string and isinstance(input_data, str):
            json_string = input_data
        
        try:
            parsed = json.loads(json_string)
            return {
                "success": True,
                "parsed": parsed,
                "parsed_at": datetime.utcnow().isoformat()
            }
        except json.JSONDecodeError as e:
            raise ValueError(f"Failed to parse JSON: {str(e)}")


class XmlParseExecutor(BaseNodeExecutor):
    """
    XML Parse Node - Parses XML strings
    """
    
    def get_required_config_fields(self) -> List[str]:
        return ["xmlString"]
    
    def _validate_custom_config(self) -> List[str]:
        errors = []
        config = self.config.config
        
        xml_string = config.get("xmlString", "")
        if xml_string:
            try:
                ET.fromstring(xml_string)
            except ET.ParseError as e:
                errors.append(f"Invalid XML: {str(e)}")
        
        return errors
    
    async def _execute_impl(self, input_data: Any) -> Any:
        """
        Parse XML string.
        """
        config = self.config.config
        xml_string = config.get("xmlString", "")
        
        if not xml_string and isinstance(input_data, str):
            xml_string = input_data
        
        try:
            root = ET.fromstring(xml_string)
            
            # Convert to dict
            def xml_to_dict(element):
                result = {}
                if element.text and element.text.strip():
                    result["_text"] = element.text.strip()
                result.update(element.attrib)
                for child in element:
                    child_data = xml_to_dict(child)
                    if child.tag in result:
                        if not isinstance(result[child.tag], list):
                            result[child.tag] = [result[child.tag]]
                        result[child.tag].append(child_data)
                    else:
                        result[child.tag] = child_data
                return result
            
            parsed = xml_to_dict(root)
            
            return {
                "success": True,
                "parsed": parsed,
                "root_tag": root.tag,
                "parsed_at": datetime.utcnow().isoformat()
            }
        except ET.ParseError as e:
            raise ValueError(f"Failed to parse XML: {str(e)}")


class CsvParseExecutor(BaseNodeExecutor):
    """
    CSV Parse Node - Parses CSV strings
    """
    
    def get_required_config_fields(self) -> List[str]:
        return ["csvString"]
    
    async def _execute_impl(self, input_data: Any) -> Any:
        """
        Parse CSV string.
        """
        config = self.config.config
        csv_string = config.get("csvString", "")
        delimiter = config.get("delimiter", ",")
        has_header = config.get("hasHeader", True)
        
        if not csv_string and isinstance(input_data, str):
            csv_string = input_data
        
        try:
            reader = csv.DictReader(io.StringIO(csv_string), delimiter=delimiter) if has_header else csv.reader(io.StringIO(csv_string), delimiter=delimiter)
            
            if has_header:
                rows = list(reader)
            else:
                rows = [{"column_" + str(i): val for i, val in enumerate(row)} for row in reader]
            
            return {
                "success": True,
                "rows": rows,
                "row_count": len(rows),
                "parsed_at": datetime.utcnow().isoformat()
            }
        except Exception as e:
            raise ValueError(f"Failed to parse CSV: {str(e)}")


class DataFilterExecutor(BaseNodeExecutor):
    """
    Data Filter Node - Filters data based on conditions
    """
    
    def get_required_config_fields(self) -> List[str]:
        return ["filter"]
    
    async def _execute_impl(self, input_data: Any) -> Any:
        """
        Filter data.
        """
        config = self.config.config
        filter_config = config.get("filter", {})
        
        # Apply filter
        if isinstance(input_data, list):
            filtered = []
            for item in input_data:
                if self._matches_filter(item, filter_config):
                    filtered.append(item)
            return {
                "original_count": len(input_data),
                "filtered_count": len(filtered),
                "filtered": filtered,
                "filtered_at": datetime.utcnow().isoformat()
            }
        else:
            # Single item
            if self._matches_filter(input_data, filter_config):
                return {
                    "original": input_data,
                    "filtered": input_data,
                    "matched": True,
                    "filtered_at": datetime.utcnow().isoformat()
                }
            else:
                return {
                    "original": input_data,
                    "filtered": None,
                    "matched": False,
                    "filtered_at": datetime.utcnow().isoformat()
                }
    
    def _matches_filter(self, item: Any, filter_config: Dict) -> bool:
        """
        Check if item matches filter conditions.
        """
        if not filter_config:
            return True
        
        # Simple filter matching
        for key, value in filter_config.items():
            if isinstance(item, dict):
                if key not in item or item[key] != value:
                    return False
            else:
                return False
        
        return True


class StringManipulationExecutor(BaseNodeExecutor):
    """
    String Manipulation Node - Performs basic string operations
    """
    
    def get_required_config_fields(self) -> List[str]:
        return ["input_field"]
    
    def _validate_custom_config(self) -> List[str]:
        errors = []
        config = self.config.config
        
        operation = config.get("operation")
        valid_operations = ["uppercase", "lowercase", "trim", "capitalize", "reverse"]
        
        if not operation:
            errors.append("Operation is required")
        elif operation not in valid_operations:
            errors.append(f"Invalid operation. Must be one of: {', '.join(valid_operations)}")
        
        return errors
    
    async def _execute_impl(self, input_data: Any) -> Any:
        """
        Perform string manipulation operation.
        """
        config = self.config.config
        input_field = config.get("input_field")
        operation = config.get("operation")
        
        # Extract the string to manipulate
        if input_field and isinstance(input_data, dict):
            text = input_data.get(input_field, "")
        else:
            text = input_data if isinstance(input_data, str) else str(input_data)
        
        # Perform operation
        try:
            result = self._perform_operation(text, operation)
            
            return {
                "original_text": text,
                "result": result,
                "operation": operation,
                "input": input_data,
                "manipulated_at": datetime.utcnow().isoformat()
            }
        except Exception as e:
            logger.error(f"Error performing string operation: {str(e)}")
            raise ValueError(f"Failed to perform string operation: {str(e)}")
    
    def _perform_operation(self, text: str, operation: str) -> str:
        """
        Perform the specified string operation.
        """
        if operation == "uppercase":
            return text.upper()
        elif operation == "lowercase":
            return text.lower()
        elif operation == "trim":
            return text.strip()
        elif operation == "capitalize":
            return text.capitalize()
        elif operation == "reverse":
            return text[::-1]
        else:
            raise ValueError(f"Unsupported operation: {operation}")


class NumberFormatterExecutor(BaseNodeExecutor):
    """
    Number Formatter Node - Formats numbers with specific decimal places and formatting
    """
    
    def get_required_config_fields(self) -> List[str]:
        return ["input_field"]
    
    async def _execute_impl(self, input_data: Any) -> Any:
        """
        Format a number according to specified formatting options.
        """
        config = self.config.config
        input_field = config.get("input_field")
        decimal_places = config.get("decimal_places", 2)
        thousands_separator = config.get("thousands_separator", False)
        prefix = config.get("prefix", "")
        suffix = config.get("suffix", "")
        
        # Extract the number to format
        if input_field and isinstance(input_data, dict):
            value = input_data.get(input_field)
        else:
            value = input_data
        
        # Convert to number if it's a string
        if isinstance(value, str):
            try:
                value = float(value)
            except ValueError:
                raise ValueError(f"Cannot convert '{value}' to a number")
        
        # Ensure it's a number
        if not isinstance(value, (int, float)):
            raise ValueError(f"Value must be a number, got {type(value).__name__}")
        
        # Format the number
        try:
            if thousands_separator:
                formatted = f"{value:,.{decimal_places}f}"
            else:
                formatted = f"{value:.{decimal_places}f}"
            
            result = f"{prefix}{formatted}{suffix}"
            
            return {
                "original_value": value,
                "formatted_value": result,
                "decimal_places": decimal_places,
                "thousands_separator": thousands_separator,
                "prefix": prefix,
                "suffix": suffix,
                "input": input_data,
                "formatted_at": datetime.utcnow().isoformat()
            }
        except Exception as e:
            logger.error(f"Error formatting number: {str(e)}")
            raise ValueError(f"Failed to format number: {str(e)}")


class DateFormatterExecutor(BaseNodeExecutor):
    """
    Date Formatter Node - Converts dates between different formats and timezones
    """
    
    def get_required_config_fields(self) -> List[str]:
        return ["input_field"]
    
    async def _execute_impl(self, input_data: Any) -> Any:
        """
        Format a date according to specified formatting options.
        """
        import datetime as dt
        
        config = self.config.config
        input_field = config.get("input_field")
        input_format = config.get("input_format", "auto")
        output_format = config.get("output_format", "%Y-%m-%d %H:%M:%S")
        
        # Extract the date to format
        if input_field and isinstance(input_data, dict):
            date_value = input_data.get(input_field)
        else:
            date_value = input_data
        
        # Parse the date
        try:
            if isinstance(date_value, str):
                if input_format == "auto":
                    # Try to parse automatically
                    parsed_date = dt.datetime.fromisoformat(date_value.replace('Z', '+00:00'))
                else:
                    parsed_date = dt.datetime.strptime(date_value, input_format)
            elif isinstance(date_value, (int, float)):
                # Assume it's a timestamp
                parsed_date = dt.datetime.fromtimestamp(date_value)
            elif isinstance(date_value, dt.datetime):
                parsed_date = date_value
            else:
                raise ValueError(f"Unsupported date type: {type(date_value).__name__}")
            
            # Format the date
            formatted_date = parsed_date.strftime(output_format)
            
            return {
                "original_date": date_value,
                "formatted_date": formatted_date,
                "input_format": input_format,
                "output_format": output_format,
                "input": input_data,
                "formatted_at": dt.datetime.utcnow().isoformat()
            }
        except Exception as e:
            logger.error(f"Error formatting date: {str(e)}")
            raise ValueError(f"Failed to format date: {str(e)}")

