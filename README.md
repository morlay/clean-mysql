# Clean Mysql

Just a tool to help cleanup some db with strong relationship.

## Usage

```
npm i -g clean-mysql
```

#### Create Config

```
clean-mysql --init
```

will create `./clean-mysql.config.json`

```json
{
  "db": {
    "host": "",
    "database": "cattle",
    "user": "cattle",
    "password": ""
  },
  "tasks": {
    "account": {
      "state": "purged"
    },
    "environment": {
      "state": "removed"
    },
    "instance": {
      "state": [
        "removed",
        "purged"
      ]
    },
    "volume": {
      "state": [
        "purged"
      ]
    }
  }
}
```

### Run

```
clean-mysql
```

will run the tasks defined in config file


#### `--dryRun`

will just should the `DELETE` sqls for checking.