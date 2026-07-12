a = [1,2,2,3,3,4,4]
unique = []
for i in range(len(a)):
    for j in range(i+1, len(a)):
        if a[i] == a[j]:
            break
    else:
        unique.append(a[i])
print(unique)