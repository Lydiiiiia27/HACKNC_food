import json
import os
from openai import OpenAI
from dotenv import load_dotenv
load_dotenv()

def extract_json_from_text(text: str) -> str:
    """
    从文本中提取JSON字符串
    """
    # 寻找最外层的方括号或大括号
    first_bracket = min((text.find('['), text.find('{')))
    if first_bracket == -1:  # 如果找不到其中一个，使用另一个
        first_bracket = max((text.find('['), text.find('{')))
    
    last_bracket = max((text.rfind(']'), text.rfind('}')))
    
    if first_bracket == -1 or last_bracket == -1:
        raise ValueError("无法在响应中找到有效的JSON数据")
        
    return text[first_bracket:last_bracket + 1]

def process_json_file(input_file: str, output_file: str, api_key: str):
    """
    一次性处理整个JSON文件，使用OpenAI新版API
    """
    # 创建OpenAI客户端
    client = OpenAI(api_key=api_key)
    
    try:
        # 读取输入文件
        with open(input_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        # 创建系统提示和用户提示
        system_prompt = """You are a helpful assistant that processes food items. 
        You must return only valid JSON data without any additional explanation or text.
        You should replace food names with full descriptive names (excluding weight numbers) 
        and classify each food item into categories based on Dietary Guidelines and Nutritional Standards in the United States, including (protein, vegetables, fruit, grain, dairy, oils, and Condiments)."""
        
        user_prompt = """Process the following JSON data and return ONLY the processed JSON:

1. Replace each 'name' with a more descriptive full name based on your knowledgee.
2. Add a 'category' field for each item based on Dietary Guidelines and Nutritional Standards in the United States, including (protein, vegetables, fruit, grain, dairy, oils, and condiments).
3. Add two fields for each item:
4. 'quantity_or_weight': a numeric value representing the quantity or weight of the item, if specified, otherwise leave it empty.
5. 'unit': the unit of measurement for the quantity or weight (e.g., 'grams', 'kg', 'pcs'), if specified, otherwise leave it empty.
6. Add a 'best_before_in_fridge' field with an estimated duration (in days) for how long each item generally stays fresh in the refrigerator based on common food storage knowledge.
7. Ensure names do not include any weight or quantity numbers.
8. Return only the processed JSON array without any explanation.
9. Only return the field I requested, do not include any additional fields.
10. Add a new field 'frozen' to indicate whether the item can be frozen or not. 1 represents this item generally stored by freezing, 0 represents this item generally not stored by freezing based on common food storage knowledge.
11. Add a new field, 'identify_name,' to store the most common or widely recognized name for each item. This name should differ from the 'name' field if necessary and reflect the typical term people use when searching for an icon or representation of this item in the market. Use a single word whenever possible, in singular form, to indicate a broad category that best describes the item (e.g., if the item is a specific chocolate bar, use 'chocolate').

Input JSON:"""
        
        # 发送请求到OpenAI
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"{user_prompt}\n{json.dumps(data, ensure_ascii=False)}"}
            ],
            temperature=0.7
        )
        
        # 获取响应内容
        content = response.choices[0].message.content.strip()
        
        try:
            # 首先尝试直接解析
            processed_data = json.loads(content)
        except json.JSONDecodeError:
            # 如果直接解析失败，尝试提取JSON部分
            print("直接解析失败，尝试提取JSON部分...")
            json_str = extract_json_from_text(content)
            print(f"提取的JSON字符串: {json_str}")
            processed_data = json.loads(json_str)

        # 写入输出文件
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(processed_data, f, ensure_ascii=False, indent=2)
            
        print(f"处理完成！结果已保存到 {output_file}")
        
    except FileNotFoundError:
        print(f"找不到输入文件: {input_file}")
    except json.JSONDecodeError as e:
        print(f"JSON解析错误: {e}")
        print(f"API返回的原始内容:\n{content}")
    except Exception as e:
        print(f"处理过程中出现错误: {e}")

def main():
    # 从环境变量获取API密钥
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("请设置OPENAI_API_KEY环境变量")
    
    # 定义输入输出文件路径
    input_file = "output_results.json"
    output_file = "output.json"
    
    # 处理文件
    process_json_file(input_file, output_file, api_key)

if __name__ == "__main__":
    main()