# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e3]:
    - generic [ref=e4]:
      - link "Späť na domov" [ref=e6] [cursor=pointer]:
        - /url: /
        - img
      - generic [ref=e7]:
        - heading "Prihlásiť sa" [level=1] [ref=e8]
        - paragraph [ref=e9]: Zadajte e-mail a heslo.
        - generic [ref=e10]:
          - generic [ref=e11]:
            - text: E-mail
            - textbox "E-mail" [ref=e12]:
              - /placeholder: vas@email.sk
              - text: predajca@test.rootie.sk
          - generic [ref=e13]:
            - generic [ref=e14]:
              - generic [ref=e15]: Heslo
              - link "Zabudli ste heslo?" [ref=e16] [cursor=pointer]:
                - /url: "#"
            - textbox "Heslo" [active] [ref=e17]:
              - /placeholder: ••••••••
              - text: test1234
        - paragraph [ref=e18]:
          - text: Nemáte účet?
          - link "Vytvoriť účet" [ref=e19] [cursor=pointer]:
            - /url: /signup?next=%2Fme
    - generic [ref=e20]:
      - button "Prihlásiť sa" [disabled]
  - button "Open Next.js Dev Tools" [ref=e26] [cursor=pointer]:
    - img [ref=e27]
  - alert [ref=e30]
```