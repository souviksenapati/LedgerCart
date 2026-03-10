import psycopg2

try:
    conn = psycopg2.connect(host='localhost', user='postgres', password='Souvik@2004#')
    conn.autocommit = True
    cur = conn.cursor()
    cur.execute("SELECT 1")
    print("PostgreSQL connected!")
    
    cur.execute("SELECT datname FROM pg_database WHERE datname='ledgercart'")
    exists = cur.fetchone()
    
    if not exists:
        cur.execute("CREATE DATABASE ledgercart")
        print("Database 'ledgercart' created!")
    else:
        print("Database 'ledgercart' already exists.")
    
    cur.close()
    conn.close()
except Exception as e:
    print(f"Error: {e}")
