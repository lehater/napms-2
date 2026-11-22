# NAPMS 2.0 — Macro-Level Functional Model

Исследовательская функциональная модель NAPMS 2.0 на SysML v2. Она описывает границу продукта, четыре макрофункции и потоки данных между ними. Это не спецификация реализации и не архитектурная схема.

## Файлы

- [model.sysml](model.sysml) — модель; пилотный файл `../sysml-pilot/model.sysml` является импортируемой зависимостью.
- [function-catalog.md](function-catalog.md) — ответственность, контракты, capability-классификация, свидетельства и состояние реализации.
- [traceability.md](traceability.md) — происхождение решений, типов и функций.
- [report.md](report.md) — граница, функциональная декомпозиция, связи, неизвестное и проверки.
- [design-prototype-v4.html](design-prototype-v4.html) — сохранённый дизайн-прототип из предыдущего эксперимента; он не является текущим визуализатором.
- `scripts/` — экспорт семантического JSON и извлечение минимальной функциональной проекции.

## Воспроизведение предыдущего эксперимента

Нужны Java 21+, Maven, Python 3 и локальный checkout установленного [DeciSym SysML v2 validator](https://github.com/DeciSym/sysmlv2-validator) с подготовленной Pilot Implementation 2026-07 (kernel 0.61.0). Исходный прототип V4 и утилиты были найдены в `/tmp/sysml-pilot-exp`; JSON выгрузка в репозиторий не переносилась.

```sh
export SYSML_VALIDATOR_HOME=/path/to/sysmlv2-validator
cd /path/to/napms-2
experiments/product-model/macro-functional-model/scripts/export-semantic-model.sh \
  experiments/product-model/macro-functional-model/model.sysml \
  NapmsMacroFunctionalModel /tmp/napms-model.json \
  experiments/product-model/sysml-pilot/model.sysml
python3 experiments/product-model/macro-functional-model/scripts/extract-functional-projection.py \
  /tmp/napms-model.json /tmp/napms-functional-projection.md
```

Аргументы экспортера: `MODEL PACKAGE OUTPUT [SUPPORT_MODEL]`. Для воспроизведения предыдущей функциональной проекции пилота используйте:

```sh
experiments/product-model/macro-functional-model/scripts/export-semantic-model.sh \
  experiments/product-model/sysml-pilot/model.sysml AccessRequestModel /tmp/pilot-model.json
python3 experiments/product-model/macro-functional-model/scripts/extract-functional-projection.py \
  /tmp/pilot-model.json /tmp/pilot-functional-projection.md AccessRequestModel
```

Скрипт использует зависимости из POM установленного валидатора и его SysML-библиотеку. Экстрактор формирует перечень action definitions и типизированных входов/выходов указанного пакета; он не строит граф композиции или поведенческие диаграммы. Для проверки синтаксиса и ссылок:

```sh
validate-sysml experiments/product-model/sysml-pilot/model.sysml \
  experiments/product-model/macro-functional-model/model.sysml
```

Предыдущий V4 — браузерный статический прототип представлений, построенных по семантической выгрузке пилота. HTML сохранён для воспроизводимости прежнего результата; его нельзя считать вычисляемым представлением новой модели.

## Ограничения прежнего эксперимента

- Экспорт семантической модели создавал файл `model.json` около 12 MB; он намеренно не включён, поскольку воспроизводим скриптом.
- Исходная функциональная проекция была около 65 KB. Новый минимальный экстрактор не заявляет полноту того генератора.
- Проекция трактовала `ActionUsage.owningNamespace`, `isComposite` и тип `ActionDefinition` как свидетельство композиции; `SuccessionAsUsage` отдельно использовался только для порядка выполнения.
- Экспорт не позволял надёжно отличить внешние/library-ссылки от пропусков экспортёра; часть ссылок оставалась неразрешённой.
- Извлечение поведения было частичным: guards/условия не во всех случаях присутствовали в JSON. Статическая валидация не исполняет бизнес-правила и не доказывает их выполнение.
- Прототип V4 — производная визуализация пилотного вертикального сценария заявки, а не целевая модель продукта и не источник дополнительных предметных связей.

Подробные исходные результаты доступны в [отчёте пилота](../sysml-pilot/report.md) и [отчёте визуализационного эксперимента](../sysml-pilot/README.md) вместе с его evidence.
